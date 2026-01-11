import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, SectionHeader, EmptyState } from '../components/ui/UIComponents';
import RefreshButton from '../components/ui/RefreshButton';
import { useHistory, HistoryFlatItem } from '../hooks/useHistory';
import { Virtuoso } from 'react-virtuoso';
import { getMediaBadgeStyle } from '../lib/theme';

function History() {
    const { flatHistory, loading, error, refetch } = useHistory();

    if (loading && flatHistory.length === 0) {
        return (
            <div className="max-w-[1000px] mx-auto p-8 text-center text-text-secondary">
                <div className="animate-pulse">Loading watch history...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-[1000px] mx-auto p-8">
                <SectionHeader title="Watch History" subtitle="Failed to load history" icon="❌" />
                <EmptyState icon="⚠️" title="Oops!" description={error} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col max-w-[1000px] mx-auto px-6">
            <div className="pt-4 pb-2 flex justify-between items-center">
                <SectionHeader
                    title="Watch History"
                    subtitle="Your recent anime viewing activity"
                />
                <RefreshButton
                    onClick={() => refetch()}
                    loading={loading}
                    title="Refresh History"
                    iconSize={18}
                />
            </div>

            <div className="flex-1 min-h-0">
                {flatHistory.length > 0 ? (
                    <Virtuoso
                        style={{ height: '100%' }}
                        customScrollParent={document.getElementById('main-scroll-container') as HTMLElement}
                        data={flatHistory}
                        overscan={200}
                        components={{
                            List: forwardRef(({ style, children, ...props }: any, ref) => (
                                <div ref={ref} {...props} style={style} className="flex flex-col gap-4 pb-20">
                                    {children}
                                </div>
                            ))
                        }}
                        itemContent={(_index, item: HistoryFlatItem) => {
                            if (item.type === 'header') {
                                return (
                                    <div className="bg-black/20 backdrop-blur-md rounded-xl py-2 px-4 sticky top-0 z-10 border border-white/5 shadow-sm mt-4 mb-2 w-fit mx-auto">
                                        <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest">
                                            {item.date}
                                        </h3>
                                    </div>
                                );
                            }

                            const data = item.data;

                            // Better approach: Import useNavigate at top level of component

                            const targetLink = data.mediaType === 'MANGA'
                                ? `/manga-details/${data.mediaId}`
                                : `/anime/${data.mediaId}`;

                            return (
                                <Link to={targetLink} className="block group">
                                    <Card
                                        hover
                                        className="bg-black/20 transition-colors duration-200 hover:bg-white/5 active:scale-[0.99] group-hover:border-white/10"
                                    >
                                        <div className="grid grid-cols-[60px_1fr_auto] gap-4 items-center">
                                            {/* Icon/Thumbnail */}
                                            <div className="w-[60px] h-[60px] rounded-xl overflow-hidden bg-white/5 flex items-center justify-center border border-white/10 shadow-inner relative group-hover:border-white/20">
                                                <img
                                                    src={data.image}
                                                    alt={data.anime}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0">
                                                <div className="font-bold text-white truncate mb-1 text-lg group-hover:text-[var(--color-zen-accent)] transition-colors" style={{ fontFamily: 'var(--font-rounded)' }}>
                                                    {data.anime}
                                                </div>
                                                <div className="text-sm flex gap-3 items-center">
                                                    {(() => {
                                                        // Use modular style getter
                                                        const style = getMediaBadgeStyle(data.mediaType, data.status);
                                                        return (
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${style.bg} ${style.text} ${style.border ? `border ${style.border}` : ''}`}>
                                                                {data.status}
                                                            </span>
                                                        );
                                                    })()}
                                                    <span className="opacity-40 text-white font-bold">{data.progress}</span>
                                                </div>
                                            </div>

                                            {/* Time */}
                                            <div className="text-xs text-white/30 font-bold tabular-nums px-3 py-1 bg-white/5 rounded-full border border-white/5 group-hover:bg-white/10 transition-colors">
                                                {data.time}
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            );
                        }}
                    />
                ) : (
                    <EmptyState
                        icon="📭"
                        title="No watch history yet"
                        description="Start updating your anime progress to see your history here"
                    />
                )}
            </div>
        </div>
    );
}

export default History;
