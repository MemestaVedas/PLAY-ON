import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GenreScore, calculateGenreAffinityScores, GenreStats } from '../../lib/recommendationEngine';
import ElasticSlider from './ElasticSlider';

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
    parentScores?: GenreScore[];
}

// Obsidian-style physics configuration
interface PhysicsConfig {
    centerForce: number;
    repelForce: number;
    linkForce: number;
    linkDistance: number;
}

const DEFAULT_PHYSICS: PhysicsConfig = {
    centerForce: 0.01,
    repelForce: 500,
    linkForce: 0.15,
    linkDistance: 250
};

// Kawaiicore Pastel Palette 🌸
const PASTEL_PALETTE = [
    '#FFB7B2', // Melon
    '#FFDAC1', // Peach
    '#E2F0CB', // Pale Green
    '#B5EAD7', // Mint
    '#C7CEEA', // Periwinkle
    '#E0BBE4', // Lavender
    '#957DAD', // Muted Purple
    '#FEC8D8', // Light Pink
    '#D4F0F0', // Pale Cyan
    '#FF9AA2', // Salmon
];

const GENRE_COLORS: Record<string, string> = {
    'Action': '#FFB7B2',
    'Adventure': '#B5EAD7',
    'Comedy': '#FFDAC1',
    'Drama': '#E0BBE4',
    'Fantasy': '#C7CEEA',
    'Horror': '#957DAD',
    'Mystery': '#D4F0F0',
    'Psychological': '#FF9AA2',
    'Romance': '#FEC8D8',
    'Sci-Fi': '#B5EAD7',
    'Slice of Life': '#E2F0CB',
    'Sports': '#FFDAC1',
    'Supernatural': '#E0BBE4',
    'Thriller': '#957DAD',
    'Mecha': '#C7CEEA',
    'Music': '#D4F0F0',
    'Ecchi': '#FFB7B2',
    'Mahou Shoujo': '#FEC8D8',
};

function getGenreColor(genre: string): string {
    if (GENRE_COLORS[genre]) return GENRE_COLORS[genre];
    // Hash to palette index for consistent random pastel colors
    let hash = 0;
    for (let i = 0; i < genre.length; i++) {
        hash = genre.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PASTEL_PALETTE.length;
    return PASTEL_PALETTE[index];
}

const getSafeId = (id: string) => id.replace(/[^a-zA-Z0-9]/g, '_');

interface GraphNode {
    id: string;
    genres: string[];
    type: 'single' | 'multi';
    val: number;
    radius: number;
    color: string;
    x: number; y: number;
    vx: number; vy: number;
    fx?: number | null; fy?: number | null;
}

interface GraphLink {
    source: string;
    target: string;
}

const COMBINATION_BONUS: Record<number, number> = {
    2: 20, 3: 30, 4: 40, 5: 50, 6: 60,
};

// Extracted SettingsPanel component to prevent re-mounting on render
interface SettingsPanelProps {
    show: boolean;
    physics: PhysicsConfig;
    setPhysics: React.Dispatch<React.SetStateAction<PhysicsConfig>>;
    reheat: (alpha?: number) => void;
}

const SettingsPanel = ({ show, physics, setPhysics, reheat }: SettingsPanelProps) => (
    <div
        className={`absolute top-14 right-4 z-30 bg-[#1a1a24]/95 backdrop-blur-xl rounded-xl p-4 w-52
        border border-white/10 shadow-2xl transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
        onMouseDown={e => e.stopPropagation()}
        onMouseMove={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
    >
        <div className="text-xs text-white/50 uppercase tracking-wider mb-3 font-medium">Forces</div>

        <div className="space-y-3">
            {[
                { label: 'Center force', key: 'centerForce', min: 0, max: 0.1, step: 0.005 },
                { label: 'Repel force', key: 'repelForce', min: 50, max: 1000, step: 50 },
                { label: 'Link force', key: 'linkForce', min: 0, max: 1, step: 0.05 },
                { label: 'Link distance', key: 'linkDistance', min: 30, max: 500, step: 10 },
            ].map(({ label, key, min, max, step }) => (
                <div key={key}>
                    <div className="flex justify-between text-xs text-white/70 mb-1">
                        <span>{label}</span>
                        <span className="text-white/40">{(physics as any)[key].toFixed(key.includes('Force') && key !== 'repelForce' ? 2 : 0)}</span>
                    </div>
                    <ElasticSlider
                        defaultValue={(physics as any)[key]}
                        startingValue={min}
                        maxValue={max}
                        stepSize={step}
                        isStepped={true}
                        onChange={(val: number) => {
                            setPhysics(p => ({ ...p, [key]: val }));
                            reheat(0.5);
                        }}
                        className="!w-full !gap-2"
                        leftIcon={null}
                        rightIcon={null}
                    />
                </div>
            ))}
        </div>

        <button
            onClick={() => { setPhysics(DEFAULT_PHYSICS); reheat(1); }}
            className="w-full mt-3 py-1.5 text-xs text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
            Reset defaults
        </button>
    </div>
);

export function GenreNetworkGraph({ entries, parentScores: providedParentScores, type }: GenreGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [links, setLinks] = useState<GraphLink[]>([]);
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    const [dragState, setDragState] = useState<{ id: string | null, startX: number, startY: number } | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [physics, setPhysics] = useState<PhysicsConfig>(DEFAULT_PHYSICS);

    // Obsidian-style alpha (simulation energy)
    const alphaRef = useRef(1);
    const alphaMinRef = useRef(0.001);
    const alphaDecayRef = useRef(0.02);

    const navigate = useNavigate();
    const nodesRef = useRef<GraphNode[]>([]);
    const reqRef = useRef<number | null>(null);
    const isDraggingRef = useRef(false);
    const hasInitializedRef = useRef(false);

    const physicsRef = useRef<PhysicsConfig>(DEFAULT_PHYSICS);

    // Direct DOM manipulation refs for performance
    const nodeRefs = useRef<Map<string, SVGGElement>>(new Map());
    const linkRefs = useRef<Map<number, SVGLineElement>>(new Map());

    // Keep physicsRef in sync with state
    useEffect(() => {
        physicsRef.current = physics;
    }, [physics]);

    // Reheat simulation
    const reheat = useCallback((alpha = 0.3) => {
        alphaRef.current = Math.max(alphaRef.current, alpha);
    }, []);

    // Resize observer with delayed initialization
    useEffect(() => {
        let animFrame: number;

        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect.width > 50 && rect.height > 50) {
                    setDimensions(prev => {
                        if (prev.width !== rect.width || prev.height !== rect.height) {
                            return { width: rect.width, height: rect.height };
                        }
                        return prev;
                    });
                }
            }
        };

        // Delayed initial check for accurate dimensions
        const checkDimensions = () => {
            updateDimensions();
            animFrame = requestAnimationFrame(checkDimensions);
        };

        // Start checking
        animFrame = requestAnimationFrame(checkDimensions);

        // Stop after 1 second
        const timeout = setTimeout(() => {
            cancelAnimationFrame(animFrame);
        }, 1000);

        const obs = new ResizeObserver(() => {
            updateDimensions();
        });

        if (containerRef.current) obs.observe(containerRef.current);

        window.addEventListener('resize', updateDimensions);

        return () => {
            cancelAnimationFrame(animFrame);
            clearTimeout(timeout);
            obs.disconnect();
            window.removeEventListener('resize', updateDimensions);
        };
    }, []);

    // Data Processing - create nodes only when we have valid dimensions
    useEffect(() => {
        if (!entries.length) return;
        if (dimensions.width < 100 || dimensions.height < 100) return;

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
                    if (type === 'anime') genreStatsMap[g].minutesWatched! += 24;
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

        const top6Parents = parentScores.slice(0, 6);
        const parentGenreSet = new Set(top6Parents.map(p => p.genre));
        const maxParentScore = Math.max(...top6Parents.map(p => p.score));

        const newNodes: GraphNode[] = [];

        // Position parents in hexagonal pattern
        const orbitRadius = Math.min(width, height) * 0.18;

        top6Parents.forEach((parent, i) => {
            const angle = (Math.PI * 2 * i) / top6Parents.length - Math.PI / 2;
            const normalizedScore = parent.score / maxParentScore;
            const radius = 22 + normalizedScore * 18;

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

        // Analyze combinations
        const combinationStats: Record<string, { count: number, genres: string[] }> = {};

        entries.forEach(entry => {
            const genres = [...(entry.media.genres || [])].sort();
            if (!genres.length) return;

            const relevantGenres = genres.filter(g => parentGenreSet.has(g));
            if (relevantGenres.length < 2) return;

            const subset = relevantGenres.slice(0, 3);
            const key = subset.join('-');

            if (!combinationStats[key]) {
                combinationStats[key] = { count: 0, genres: subset };
            }
            combinationStats[key].count++;
        });

        const combinations = Object.values(combinationStats)
            .filter(c => c.count >= 1)
            .map(c => {
                const numGenres = c.genres.length;
                const bonus = COMBINATION_BONUS[numGenres] || 0;
                return { ...c, score: c.count + bonus };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 25);

        const maxComboScore = combinations.length > 0
            ? Math.max(...combinations.map(c => c.score))
            : 1;

        // Position combos in outer ring
        const comboOrbitRadius = Math.min(width, height) * 0.32;

        combinations.forEach((combo, i) => {
            const normalizedScore = combo.score / maxComboScore;
            const radius = 7 + normalizedScore * 10;
            const angle = (Math.PI * 2 * i) / Math.max(combinations.length, 1);

            newNodes.push({
                id: combo.genres.join('-'),
                genres: combo.genres,
                type: 'multi',
                val: combo.score,
                radius,
                color: 'gradient',
                x: cx + comboOrbitRadius * Math.cos(angle) + (Math.random() - 0.5) * 20,
                y: cy + comboOrbitRadius * Math.sin(angle) + (Math.random() - 0.5) * 20,
                vx: 0, vy: 0
            });
        });

        // Create Links
        const newLinks: GraphLink[] = [];
        newNodes.forEach(node => {
            if (node.type === 'multi') {
                node.genres.forEach(g => {
                    const parentNode = newNodes.find(n => n.type === 'single' && n.id === g);
                    if (parentNode) {
                        newLinks.push({ source: parentNode.id, target: node.id });
                    }
                });
            }
        });

        nodesRef.current = newNodes;
        setNodes([...newNodes]);
        setLinks(newLinks);

        // Reset view and simulation
        setTransform({ x: 0, y: 0, k: 1 });
        alphaRef.current = 1;
        hasInitializedRef.current = true;

    }, [entries, providedParentScores, dimensions, type]);

    // Physics Engine
    useEffect(() => {
        const updatePhysics = () => {
            const nodes = nodesRef.current;
            if (!nodes.length) {
                reqRef.current = requestAnimationFrame(updatePhysics);
                return;
            }

            const alpha = alphaRef.current;
            if (alpha < alphaMinRef.current) {
                reqRef.current = requestAnimationFrame(updatePhysics);
                return;
            }

            const w = dimensions.width;
            const h = dimensions.height;
            if (w < 100 || h < 100) {
                reqRef.current = requestAnimationFrame(updatePhysics);
                return;
            }

            const cx = w / 2;
            const cy = h / 2;

            const { centerForce, repelForce, linkForce, linkDistance } = physicsRef.current;

            // 1. Repulsion + Hard Collision
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];

                    let dx = a.x - b.x;
                    let dy = a.y - b.y;
                    let distSq = dx * dx + dy * dy;

                    if (distSq < 1) {
                        dx = (Math.random() - 0.5) * 10;
                        dy = (Math.random() - 0.5) * 10;
                        distSq = dx * dx + dy * dy;
                    }

                    const dist = Math.sqrt(distSq);
                    const minDist = a.radius + b.radius + 40; // Larger minimum gap

                    // Standard repulsion
                    let force = repelForce / (distSq + 50);

                    // Hard collision - strong push when overlapping
                    if (dist < minDist) {
                        const overlap = minDist - dist;
                        force = Math.max(force, overlap * 2); // Strong push proportional to overlap
                    }

                    // Extra repulsion between parent nodes
                    if (a.type === 'single' && b.type === 'single') {
                        force *= 3;
                    }

                    const fx = (dx / dist) * force * alpha;
                    const fy = (dy / dist) * force * alpha;

                    if (a.fx == null) { a.vx += fx; a.vy += fy; }
                    if (b.fx == null) { b.vx -= fx; b.vy -= fy; }
                }
            }

            // 2. Center Force
            nodes.forEach(n => {
                if (n.fx == null) {
                    const dx = cx - n.x;
                    const dy = cy - n.y;
                    const strength = n.type === 'single' ? centerForce * 0.3 : centerForce;
                    n.vx += dx * strength * alpha;
                    n.vy += dy * strength * alpha;
                }
            });

            // 3. Link Force
            links.forEach(l => {
                const s = nodes.find(n => n.id === l.source);
                const t = nodes.find(n => n.id === l.target);
                if (!s || !t) return;

                const dx = t.x - s.x;
                const dy = t.y - s.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                const diff = (dist - linkDistance) / dist;
                const force = diff * linkForce * alpha;

                const fx = dx * force;
                const fy = dy * force;

                if (s.fx == null) { s.vx += fx * 0.2; s.vy += fy * 0.2; }
                if (t.fx == null) { t.vx -= fx; t.vy -= fy; }
            });

            // 4. Update positions
            const damping = 0.7;

            nodes.forEach(n => {
                if (n.fx != null) {
                    n.x = n.fx;
                    n.y = n.fy!;
                    n.vx = 0;
                    n.vy = 0;
                } else {
                    n.vx *= damping;
                    n.vy *= damping;
                    n.x += n.vx;
                    n.y += n.vy;

                    // Keep nodes in bounds
                    const margin = 50;
                    n.x = Math.max(margin, Math.min(w - margin, n.x));
                    n.y = Math.max(margin, Math.min(h - margin, n.y));
                }

                // Direct DOM update for node
                const el = nodeRefs.current.get(n.id);
                if (el) {
                    el.setAttribute('transform', `translate(${n.x},${n.y})`);
                }
            });

            // Direct DOM update for links
            links.forEach((l, i) => {
                const s = nodes.find(n => n.id === l.source);
                const t = nodes.find(n => n.id === l.target);
                const el = linkRefs.current.get(i);

                if (s && t && el) {
                    el.setAttribute('x1', String(s.x));
                    el.setAttribute('y1', String(s.y));
                    el.setAttribute('x2', String(t.x));
                    el.setAttribute('y2', String(t.y));
                }
            });

            // Alpha decay
            alphaRef.current *= (1 - alphaDecayRef.current);

            // setNodes removed to prevent re-render loop
            reqRef.current = requestAnimationFrame(updatePhysics);
        };

        // Always run physics loop
        cancelAnimationFrame(reqRef.current || 0);
        reqRef.current = requestAnimationFrame(updatePhysics);

        return () => cancelAnimationFrame(reqRef.current || 0);
    }, [links, dimensions]);

    // Reheat simulation when physics config changes
    useEffect(() => {
        if (hasInitializedRef.current) {
            reheat(0.5);
        }
    }, [physics, reheat]);

    // Interaction Handlers
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;

        const oldK = transform.k;
        const newK = Math.min(Math.max(0.3, oldK + delta), 4);

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
        isDraggingRef.current = false;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const wx = (mx - transform.x) / transform.k;
        const wy = (my - transform.y) / transform.k;

        const hit = nodesRef.current.slice().reverse().find(n => {
            const dx = n.x - wx;
            const dy = n.y - wy;
            return dx * dx + dy * dy <= (n.radius * n.radius * 1.5);
        });

        if (hit) {
            setDragState({ id: hit.id, startX: wx, startY: wy });
            hit.fx = hit.x;
            hit.fy = hit.y;
            reheat(0.3);
        } else {
            setDragState({ id: null, startX: e.clientX, startY: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragState) return;

        isDraggingRef.current = true;

        if (dragState.id) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mx = (e.clientX - rect.left - transform.x) / transform.k;
            const my = (e.clientY - rect.top - transform.y) / transform.k;

            const node = nodesRef.current.find(n => n.id === dragState.id);
            if (node) {
                node.fx = mx;
                node.fy = my;
                reheat(0.05);
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
            if (node) {
                node.fx = null;
                node.fy = null;
            }
            reheat(0.3);
        }
        setDragState(null);
    };

    const handleNodeClick = (e: React.MouseEvent, node: GraphNode) => {
        e.stopPropagation();
        if (isDraggingRef.current) return;

        const searchType = type === 'anime' ? 'anime-browse' : 'manga-browse';
        const query = node.genres[0];
        navigate(`/${searchType}?q=${encodeURIComponent(query)}`);
    };

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
            className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
            style={{
                minHeight: '500px',
                // background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d12 100%)'
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Subtle grid background */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px'
                }}
            />

            <svg width="100%" height="100%" className="block" style={{ fontFamily: 'var(--font-rounded)' }}>
                <defs>
                    <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>

                    {nodes.filter(n => n.type === 'multi').map(n => {
                        const colors = n.genres.map(g => getGenreColor(g));
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
                    {/* Links */}
                    {links.map((link, i) => {
                        const s = nodes.find(n => n.id === link.source);
                        const t = nodes.find(n => n.id === link.target);
                        if (!s || !t) return null;

                        const isDim = hoveredNode && !activeSet.has(link.source) && !activeSet.has(link.target);
                        const isActive = hoveredNode && (link.source === hoveredNode || link.target === hoveredNode);

                        return (
                            <line
                                key={i}
                                ref={el => { if (el) linkRefs.current.set(i, el); else linkRefs.current.delete(i); }}
                                x1={s.x} y1={s.y}
                                x2={t.x} y2={t.y}
                                stroke={isActive ? "rgba(168,139,250,0.7)" : "rgba(255,255,255,0.2)"}
                                strokeWidth={isActive ? 1.5 : 0.5}
                                strokeOpacity={isDim ? 0.05 : 1}
                                style={{ transition: 'stroke 0.2s ease-out, stroke-width 0.2s ease-out, stroke-opacity 0.2s ease-out' }}
                            />
                        );
                    })}

                    {/* Nodes */}
                    {nodes.map(node => {
                        const isDim = hoveredNode && !activeSet.has(node.id);
                        const isMulti = node.type === 'multi';
                        const isHovered = hoveredNode === node.id;
                        const safeId = getSafeId(node.id);
                        const nodeColor = isMulti ? `url(#grad-${safeId})` : node.color;

                        return (
                            <g
                                key={node.id}
                                ref={el => { if (el) nodeRefs.current.set(node.id, el); else nodeRefs.current.delete(node.id); }}
                                transform={`translate(${node.x},${node.y})`}
                                onMouseEnter={() => setHoveredNode(node.id)}
                                onMouseLeave={() => setHoveredNode(null)}
                                onClick={(e) => handleNodeClick(e, node)}
                                style={{ cursor: 'pointer' }}
                                opacity={isDim ? 0.25 : 1}
                            >
                                {/* Outer glow - only active when hovered */}
                                <circle
                                    r={node.radius + (isHovered ? 15 : 0)}
                                    fill={isMulti ? getGenreColor(node.genres[0]) : node.color}
                                    opacity={isHovered ? 0.4 : 0}
                                    filter="url(#nodeGlow)"
                                    style={{ transition: 'all 0.2s ease-out' }}
                                />

                                {/* Main circle */}
                                <circle
                                    r={node.radius}
                                    fill={nodeColor}
                                    opacity={0.9}
                                    stroke={isHovered ? "rgba(255,255,255,0.7)" : (isMulti ? "rgba(255,255,255,0.15)" : "none")}
                                    strokeWidth={isHovered ? 2 : 1}
                                    style={{ transition: 'all 0.15s ease-out' }}
                                />

                                {/* Label - Visible on zoom > 1.2 OR hover */}
                                <text
                                    dy={isMulti ? node.radius + 14 : 5}
                                    textAnchor="middle"
                                    dominantBaseline={isMulti ? "auto" : "middle"}
                                    fill={isMulti ? "white" : "rgba(0,0,0,0.85)"}
                                    fontSize={isMulti ? 9 : 12}
                                    fontWeight={isMulti ? "600" : "800"}
                                    opacity={(transform.k > 1.2 || isHovered) ? (isDim ? 0.3 : 1) : 0}
                                    style={{
                                        pointerEvents: 'none',
                                        textShadow: isMulti ? '0 2px 8px rgba(0,0,0,0.9)' : 'none',
                                        fontFamily: 'var(--font-rounded)',
                                        transition: 'opacity 0.2s ease-out'
                                    }}
                                >
                                    {isMulti
                                        ? node.genres.join(node.genres.length > 2 ? ' / ' : ' + ')
                                        : node.genres[0]
                                    }
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>

            {/* Bottom info */}
            <div className="absolute bottom-4 left-4 text-[10px] text-white/40 font-mono z-10 bg-black/30 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                {parentCount} genres • {childCount} combinations • {dimensions.width}x{dimensions.height}
            </div>

            {/* Controls */}
            <div className="absolute top-4 right-4 flex gap-2 z-20">
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-lg transition-all ${showSettings ? 'bg-white/10 text-white/90' : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90'} border border-white/10`}
                    title="Settings"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                </button>
                <button
                    onClick={() => { setTransform({ x: 0, y: 0, k: 1 }); }}
                    className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-white/60 hover:text-white/90 transition-all border border-white/10"
                    title="Reset View"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                </button>
            </div>

            <SettingsPanel
                show={showSettings}
                physics={physics}
                setPhysics={setPhysics}
                reheat={reheat}
            />
        </div>
    );
}
