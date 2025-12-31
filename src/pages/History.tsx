import { forwardRef } from 'react';
import { Card, SectionHeader, EmptyState } from '../components/ui/UIComponents';
import { useHistory, HistoryFlatItem } from '../hooks/useHistory';
import { Virtuoso } from 'react-virtuoso';

function History() {
    const { flatHistory, loading, error } = useHistory();

    if (loading) {
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
            <div className="pt-4 pb-2">
                <SectionHeader
                    title="Watch History"
                    subtitle="Your recent anime viewing activity"
                    icon="🕒"
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
                                <div ref={ref} {...props} style={style} className="flex flex-col gap-3 pb-20">
                                    {children}
                                </div>
                            ))
                        }}
                        itemContent={(_index, item: HistoryFlatItem) => {
                            if (item.type === 'header') {
                                return (
                                    <h3 className="text-lg font-semibold text-text-secondary uppercase tracking-wider py-4 bg-[#0f0f0f] sticky top-0 z-10">
                                        {item.date}
                                    </h3>
                                );
                            }

                            const data = item.data;
                            return (
                                <Card hover>
                                    <div className="grid grid-cols-[60px_1fr_auto] gap-4 items-center">
                                        {/* Icon/Thumbnail */}
                                        <div className="w-[60px] h-[60px] rounded-xl overflow-hidden bg-surface-light flex items-center justify-center border border-white/5">
                                            <img
                                                src={data.image}
                                                alt={data.anime}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg';
                                                }}
                                            />
                                        </div>

                                        {/* Info */}
                                        <div className="min-w-0">
                                            <div className="font-bold text-white truncate mb-1">
                                                {data.anime}
                                            </div>
                                            <div className="text-sm text-text-secondary flex gap-2 items-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${data.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                    {data.status}
                                                </span>
                                                <span className="opacity-70">{data.progress}</span>
                                            </div>
                                        </div>

                                        {/* Time */}
                                        <div className="text-sm text-text-secondary font-medium tabular-nums px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                                            {data.time}
                                        </div>
                                    </div>
                                </Card>
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
