import { useMemo, useState, useRef, useEffect } from 'react';
import { GenreScore, calculateGenreAffinityScores, GenreStats } from '../../lib/recommendationEngine';

interface ListEntry {
    media: {
        id: number;
        title: { english: string; romaji: string; };
        coverImage: { medium: string; };
        genres?: string[];
        averageScore?: number;
    };
    score: number;
}

interface GenreGraphProps {
    entries: ListEntry[];
    onNodeClick?: (id: string) => void;
    type: 'anime' | 'manga';
    parentScores?: GenreScore[]; // Optional: Top 6 genres from radar graph
}

const GENRE_COLORS: Record<string, string> = {
    'Action': '#FF6B6B', 'Adventure': '#4ECDC4', 'Comedy': '#FFE66D',
    'Drama': '#95E1D3', 'Fantasy': '#DDA0DD', 'Horror': '#8B4563',
    'Mystery': '#9B59B6', 'Psychological': '#E74C3C', 'Romance': '#FFB7B2',
    'Sci-Fi': '#00CED1', 'Slice of Life': '#98D8C8', 'Sports': '#F39C12',
    'Supernatural': '#8E44AD', 'Thriller': '#C0392B', 'Mecha': '#3498DB',
    'Music': '#1ABC9C', 'Ecchi': '#FF69B4', 'Mahou Shoujo': '#FF1493',
};

function getGenreColor(genre: string): string {
    if (GENRE_COLORS[genre]) return GENRE_COLORS[genre];
    // Procedural color for unknown genres
    let hash = 0;
    for (let i = 0; i < genre.length; i++) {
        hash = genre.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 65%)`;
}

// Helper to sanitize IDs for SVG url references (handle spaces/special chars)
const getSafeId = (id: string) => id.replace(/[^a-zA-Z0-9]/g, '_');

interface GraphNode {
    id: string; // "Action" or "Action-Comedy"
    genres: string[];
    type: 'single' | 'multi'; // Parent (single) vs Child (multi)
    val: number; // score/importance
    radius: number;
    color: string; // Solid or ID for gradient

    // Physics
    x: number; y: number;
    vx: number; vy: number;
    fx?: number | null; fy?: number | null;
}

interface GraphLink {
    source: string;
    target: string;
}

// Bonus points for genre combinations
const COMBINATION_BONUS: Record<number, number> = {
    2: 20,
    3: 30,
    4: 40,
    5: 50,
    6: 60,
};

export function GenreNetworkGraph({ entries, parentScores: providedParentScores, type }: GenreGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 1000, height: 800 });
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [links, setLinks] = useState<GraphLink[]>([]);
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    const [dragState, setDragState] = useState<{ id: string | null, startX: number, startY: number } | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const nodesRef = useRef<GraphNode[]>([]);
    const reqRef = useRef<number | null>(null);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsFullscreen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // -- 1. Data Processing --
    useEffect(() => {
        if (!entries.length) return;

        // Fallback: calculate parent scores if not provided
        let parentScores = providedParentScores;
        if (!parentScores || parentScores.length === 0) {
            const genreStatsMap: Record<string, GenreStats> = {};
            entries.forEach(entry => {
                entry.media.genres?.forEach(g => {
                    if (!genreStatsMap[g]) {
                        genreStatsMap[g] = { genre: g, count: 0, meanScore: 0, minutesWatched: 0, chaptersRead: 0 };
                    }
                    genreStatsMap[g].count++;
                    genreStatsMap[g].meanScore += entry.score || entry.media.averageScore || 50;
                    if (type === 'anime') genreStatsMap[g].minutesWatched! += 24; // Average ep length
                    else genreStatsMap[g].chaptersRead! += 1;
                });
            });

            const statsArray = Object.values(genreStatsMap).map(s => ({
                ...s,
                meanScore: s.meanScore / s.count
            }));

            parentScores = calculateGenreAffinityScores(statsArray, type).slice(0, 6);
        }

        if (!parentScores || parentScores.length === 0) return;

        const width = dimensions.width;
        const height = dimensions.height;
        const cx = width / 2;
        const cy = height / 2;

        // Get the top 6 parent genres from radar scores
        const top6Parents = parentScores.slice(0, 6);
        const parentGenreSet = new Set(top6Parents.map(p => p.genre));

        // Calculate max parent score for sizing normalization
        const maxParentScore = Math.max(...top6Parents.map(p => p.score));

        // Create parent nodes (6 big nodes in the center)
        const newNodes: GraphNode[] = [];

        // Position parents in a hexagonal pattern around center
        top6Parents.forEach((parent, i) => {
            const angle = (Math.PI * 2 * i) / top6Parents.length - Math.PI / 2;
            const orbitRadius = 180; // Increased distance from center for better spacing

            // Size proportional to radar score (min 35, max 60)
            const normalizedScore = parent.score / maxParentScore;
            const radius = 35 + normalizedScore * 25;

            newNodes.push({
                id: parent.genre,
                genres: [parent.genre],
                type: 'single',
                val: parent.score,
                radius,
                color: getGenreColor(parent.genre),
                x: cx + orbitRadius * Math.cos(angle),
                y: cy + orbitRadius * Math.sin(angle),
                vx: 0, vy: 0
            });
        });

        // Analyze entries for combinations
        const combinationStats: Record<string, { count: number, genres: string[] }> = {};

        entries.forEach(entry => {
            const genres = [...(entry.media.genres || [])].sort();
            if (!genres.length) return;

            // Only consider genres that are in our parent set
            const relevantGenres = genres.filter(g => parentGenreSet.has(g));
            if (relevantGenres.length < 2) return; // Need at least 2 to form a combo

            // Create combinations (up to 3 genres for visual clarity)
            const subset = relevantGenres.slice(0, 3);
            const key = subset.join('-');

            if (!combinationStats[key]) {
                combinationStats[key] = { count: 0, genres: subset };
            }
            combinationStats[key].count++;
        });

        // Calculate combination scores with bonus system
        const combinations = Object.values(combinationStats)
            .filter(c => c.count >= 1)
            .map(c => {
                const numGenres = c.genres.length;
                const bonus = COMBINATION_BONUS[numGenres] || 0;
                return {
                    ...c,
                    score: c.count + bonus
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 25); // Limit to top 25 combinations

        // Find max combination score for sizing
        const maxComboScore = combinations.length > 0
            ? Math.max(...combinations.map(c => c.score))
            : 1;

        // Create combination (child) nodes
        combinations.forEach(combo => {
            // Size based on score (min 12, max 28)
            const normalizedScore = combo.score / maxComboScore;
            const radius = 12 + normalizedScore * 16;

            // Random position starting in outer ring
            const angle = Math.random() * Math.PI * 2;
            const dist = 300 + Math.random() * 100; // Push children further out

            newNodes.push({
                id: combo.genres.join('-'),
                genres: combo.genres,
                type: 'multi',
                val: combo.score,
                radius,
                color: 'gradient',
                x: cx + dist * Math.cos(angle),
                y: cy + dist * Math.sin(angle),
                vx: 0, vy: 0
            });
        });

        // Create Links: ONLY Parent -> Child
        const newLinks: GraphLink[] = [];

        newNodes.forEach(node => {
            if (node.type === 'multi') {
                // Connect this child node to its parent (single-genre) nodes
                node.genres.forEach(g => {
                    const parentNode = newNodes.find(n => n.type === 'single' && n.id === g);
                    if (parentNode) {
                        newLinks.push({ source: parentNode.id, target: node.id });
                    }
                });
            }
        });

        nodesRef.current = newNodes;
        setNodes(newNodes);
        setLinks(newLinks);
        setTransform({ x: 0, y: 0, k: 1 });

    }, [entries, providedParentScores, dimensions]);

    // -- 2. Physics Engine --
    useEffect(() => {
        const updatePhysics = () => {
            const nodes = nodesRef.current;
            const w = dimensions.width;
            const h = dimensions.height;
            const cx = w / 2;
            const cy = h / 2;

            const repulse = 8000;
            const spring = 0.02; // Looser springs
            const centerStrength = 0.002;
            const parentCenterStrength = 0.008; // Weaker pull to center for parents

            // 1. Repulsion between all nodes
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    let dx = a.x - b.x;
                    let dy = a.y - b.y;
                    let distSq = dx * dx + dy * dy;
                    if (distSq === 0) { dx = 0.1; distSq = 0.01; }

                    const dist = Math.sqrt(distSq);

                    // Extra repulsion for parent nodes interaction
                    let force = repulse / (distSq + 100);
                    if (a.type === 'single' && b.type === 'single') {
                        force *= 3.0; // Stronger repulsion between parents
                    }

                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;

                    if (!a.fx) { a.vx += fx; a.vy += fy; }
                    if (!b.fx) { b.vx -= fx; b.vy -= fy; }
                }
            }

            // 2. Center Gravity
            nodes.forEach(n => {
                if (!n.fx) {
                    const strength = n.type === 'single' ? parentCenterStrength : centerStrength;
                    n.vx -= (n.x - cx) * strength;
                    n.vy -= (n.y - cy) * strength;
                }
            });

            // 3. Spring forces for links
            links.forEach(l => {
                const s = nodes.find(n => n.id === l.source);
                const t = nodes.find(n => n.id === l.target);
                if (s && t) {
                    const dx = t.x - s.x;
                    const dy = t.y - s.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const targetDist = 160; // Longer links

                    const diff = dist - targetDist;
                    const f = diff * spring;

                    const fx = (dx / dist) * f;
                    const fy = (dy / dist) * f;

                    if (!s.fx) { s.vx += fx * 0.2; s.vy += fy * 0.2; } // Parents move less
                    if (!t.fx) { t.vx -= fx; t.vy -= fy; }
                }
            });

            // 4. Update positions
            const dt = 1;
            const damp = 0.88;
            let maxV = 0;

            nodes.forEach(n => {
                if (n.fx != null) {
                    n.x = n.fx;
                    n.y = n.fy!;
                    n.vx = 0; n.vy = 0;
                } else {
                    n.vx *= damp;
                    n.vy *= damp;
                    n.x += n.vx * dt;
                    n.y += n.vy * dt;

                    // Bound checks
                    if (n.x < -w) n.x = -w; if (n.x > w * 2) n.x = w * 2;
                    if (n.y < -h) n.y = -h; if (n.y > h * 2) n.y = h * 2;
                }
                maxV = Math.max(maxV, Math.abs(n.vx), Math.abs(n.vy));
            });

            if (maxV > 0.1) {
                setNodes([...nodes]);
                reqRef.current = requestAnimationFrame(updatePhysics);
            }
        };

        if (nodesRef.current.length) {
            cancelAnimationFrame(reqRef.current || 0);
            reqRef.current = requestAnimationFrame(updatePhysics);
        }
        return () => cancelAnimationFrame(reqRef.current || 0);
    }, [links, dimensions]);

    // -- 3. Interaction Handlers --

    const handleWheel = (e: React.WheelEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;

        const oldK = transform.k;
        const newK = Math.min(Math.max(0.2, oldK + delta), 8);

        if (newK === oldK) return;

        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const wx = (mx - transform.x) / oldK;
        const wy = (my - transform.y) / oldK;

        const newX = mx - wx * newK;
        const newY = my - wy * newK;

        setTransform({ x: newX, y: newY, k: newK });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const wx = (mx - transform.x) / transform.k;
        const wy = (my - transform.y) / transform.k;

        const hit = nodesRef.current.slice().reverse().find(n => {
            const dx = n.x - wx;
            const dy = n.y - wy;
            return dx * dx + dy * dy <= n.radius * n.radius;
        });

        if (hit) {
            setDragState({ id: hit.id, startX: wx, startY: wy });
            hit.fx = hit.x;
            hit.fy = hit.y;
            cancelAnimationFrame(reqRef.current || 0);
        } else {
            setDragState({ id: null, startX: e.clientX, startY: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragState) return;

        if (dragState.id) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mx = (e.clientX - rect.left - transform.x) / transform.k;
            const my = (e.clientY - rect.top - transform.y) / transform.k;

            const node = nodesRef.current.find(n => n.id === dragState.id);
            if (node) {
                node.fx = mx;
                node.fy = my;
                setNodes([...nodesRef.current]);
            }
        } else {
            const dx = e.clientX - dragState.startX;
            const dy = e.clientY - dragState.startY;
            setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
            setDragState({ ...dragState, startX: e.clientX, startY: e.clientY });
        }
    };

    const handleMouseUp = () => {
        if (dragState?.id) {
            const node = nodesRef.current.find(n => n.id === dragState.id);
            if (node) { node.fx = null; node.fy = null; }
            if (nodesRef.current.length) {
                reqRef.current = requestAnimationFrame(() => {
                    setNodes([...nodesRef.current]);
                });
            }
        }
        setDragState(null);
    };

    // Resize observer
    useEffect(() => {
        const obs = new ResizeObserver(entries => {
            for (let entry of entries) {
                setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
            }
        });
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    const getNeighbors = (id: string | null) => {
        if (!id) return new Set<string>();
        const s = new Set<string>();
        s.add(id);
        links.forEach(l => {
            if (l.source === id) s.add(l.target);
            if (l.target === id) s.add(l.source);
        });
        return s;
    };

    const activeSet = useMemo(() => getNeighbors(hoveredNode), [hoveredNode, links]);

    const parentCount = nodes.filter(n => n.type === 'single').length;
    const childCount = nodes.filter(n => n.type === 'multi').length;

    return (
        <div
            ref={containerRef}
            className={`${isFullscreen
                ? 'fixed inset-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-xl'
                : 'w-full h-full relative bg-transparent'
                } cursor-grab active:cursor-grabbing overflow-visible transition-all duration-500`}
            style={isFullscreen ? {} : { width: '100%', height: '100%', minHeight: '600px' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <svg width="100%" height="100%" className="block overflow-visible">
                <defs>
                    {/* Gradient definitions for multi-genre nodes */}
                    {nodes.filter(n => n.type === 'multi').map(n => {
                        const colors = n.genres.map(g => getGenreColor(g));
                        // Sanitize ID for SVG reference
                        const safeId = getSafeId(n.id);
                        return (
                            <linearGradient key={`grad-${safeId}`} id={`grad-${safeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                {colors.map((c, i) => (
                                    <stop key={i} offset={`${(i / Math.max(colors.length - 1, 1)) * 100}%`} stopColor={c} />
                                ))}
                            </linearGradient>
                        );
                    })}
                </defs>

                <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
                    {links.map((link, i) => {
                        const s = nodes.find(n => n.id === link.source);
                        const t = nodes.find(n => n.id === link.target);
                        if (!s || !t) return null;

                        const isDim = hoveredNode && !activeSet.has(link.source) && !activeSet.has(link.target);
                        const isHigh = hoveredNode && (link.source === hoveredNode || link.target === hoveredNode);

                        return (
                            <line
                                key={i}
                                x1={s.x} y1={s.y}
                                x2={t.x} y2={t.y}
                                stroke="white"
                                strokeWidth={isHigh ? 2.5 : 1.5}
                                strokeOpacity={isDim ? 0.03 : isHigh ? 0.7 : 0.15}
                                style={{ transition: 'stroke-opacity 0.2s' }}
                            />
                        );
                    })}

                    {nodes.map(node => {
                        const isDim = hoveredNode && !activeSet.has(node.id);
                        const isMulti = node.type === 'multi';
                        const isHovered = hoveredNode === node.id;
                        const safeId = getSafeId(node.id);

                        return (
                            <g
                                key={node.id}
                                transform={`translate(${node.x},${node.y})`}
                                onMouseEnter={() => setHoveredNode(node.id)}
                                onMouseLeave={() => setHoveredNode(null)}
                                style={{ cursor: 'pointer' }}
                            >
                                {!isMulti && (
                                    <circle
                                        r={node.radius + 8}
                                        fill={node.color}
                                        opacity={isDim ? 0 : 0.15}
                                        style={{ filter: 'blur(8px)', transition: 'opacity 0.2s' }}
                                    />
                                )}

                                <circle
                                    r={node.radius}
                                    fill={isMulti ? `url(#grad-${safeId})` : node.color}
                                    opacity={isDim ? 0.15 : 1}
                                    stroke={isHovered ? "#fff" : "rgba(255,255,255,0.2)"}
                                    strokeWidth={isHovered ? 3 : 1}
                                    style={{ transition: 'opacity 0.2s, stroke-width 0.15s' }}
                                />

                                <text
                                    dy={node.radius + 14}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize={isMulti ? 9 : 11}
                                    fontWeight={isMulti ? "500" : "700"}
                                    opacity={isDim ? 0.1 : (hoveredNode ? 1 : 0.85)}
                                    style={{
                                        pointerEvents: 'none',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                                        transition: 'opacity 0.2s'
                                    }}
                                >
                                    {isMulti
                                        ? node.genres.join(node.genres.length > 2 ? ' / ' : ' + ')
                                        : node.genres[0]
                                    }
                                </text>

                                {!isMulti && (
                                    <text
                                        dy={4}
                                        textAnchor="middle"
                                        fill="rgba(0,0,0,0.6)"
                                        fontSize={10}
                                        fontWeight="bold"
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {Math.round(node.val * 100)}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </g>
            </svg>

            <div className="absolute bottom-4 left-4 pointer-events-none opacity-60 text-[10px] text-white font-mono z-10 transition-opacity duration-300 hover:opacity-100">
                {parentCount} Parents • {childCount} Combos • Drag nodes • Wheel to Zoom • {isFullscreen ? 'ESC to Exit' : ''}
            </div>

            <div className="absolute top-4 right-4 flex gap-2 z-20">
                <button
                    onClick={() => setTransform({ x: 0, y: 0, k: 1 })}
                    className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white/50 hover:text-white transition-colors"
                    title="Reset View"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                </button>
                <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white/50 hover:text-white transition-colors"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {isFullscreen ? (
                            <>
                                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                            </>
                        ) : (
                            <>
                                <path d="M15 3h6v6" />
                                <path d="M9 21H3v-6" />
                                <path d="M21 3l-7 7" />
                                <path d="M3 21l7-7" />
                            </>
                        )}
                    </svg>
                </button>
            </div>
        </div>
    );
}
