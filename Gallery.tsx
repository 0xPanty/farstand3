import { useState, useEffect } from 'react';
import { ArrowLeft, Loader, Users, Sparkles } from 'lucide-react';
import type { StandResult } from './types';

interface GalleryStand {
  id: number;
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  stand_name: string;
  gender: string;
  stand_description: string;
  ability: string;
  battle_cry: string;
  stats: any;
  stand_image_url: string;
  created_at: string;
  updated_at: string;
}

interface GalleryProps {
  onBack: () => void;
}

export default function Gallery({ onBack }: GalleryProps) {
  const [stands, setStands] = useState<GalleryStand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStand, setSelectedStand] = useState<GalleryStand | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/get-gallery?limit=${limit}&offset=${offset}`);
      const data = await response.json();

      if (data.success) {
        setStands(prev => offset === 0 ? data.stands : [...prev, ...data.stands]);
        setHasMore(data.hasMore);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setOffset(prev => prev + limit);
    loadGallery();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0015] to-[#2e003e] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">❌ {error}</p>
          <button onClick={onBack} className="text-[#fbbf24] underline">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0015] to-[#2e003e] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b-2 border-[#fbbf24]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-[#fbbf24] hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-bold">BACK</span>
          </button>
          
          <div className="flex items-center gap-2">
            <Users className="text-[#db2777]" size={24} />
            <h1 className="text-2xl font-black tracking-wider">
              STAND GALLERY
            </h1>
          </div>
          
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading && stands.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-[#fbbf24]" size={48} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stands.map((stand) => (
                <div
                  key={stand.id}
                  onClick={() => setSelectedStand(stand)}
                  className="group cursor-pointer bg-black/40 border-2 border-[#db2777]/30 hover:border-[#fbbf24] rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(251,191,36,0.3)]"
                >
                  {/* Stand Image */}
                  <div className="aspect-square bg-gradient-to-br from-[#1a0b2e] to-[#2e003e] relative overflow-hidden">
                    {stand.stand_image_url ? (
                      <img 
                        src={stand.stand_image_url} 
                        alt={stand.stand_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="text-[#db2777] opacity-30" size={64} />
                      </div>
                    )}
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <p className="text-sm line-clamp-2">{stand.ability}</p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-xl font-black text-[#fbbf24] mb-1 truncate">
                      {stand.stand_name.replace(/[『』]/g, '')}
                    </h3>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <img 
                        src={stand.pfp_url} 
                        alt={stand.display_name}
                        className="w-6 h-6 rounded-full border border-[#db2777]"
                      />
                      <p className="text-sm text-gray-400 truncate">
                        @{stand.username}
                      </p>
                    </div>

                    {/* Stats Preview */}
                    <div className="flex gap-1 text-xs">
                      {Object.entries(stand.stats || {}).slice(0, 6).map(([key, value]) => (
                        <span 
                          key={key}
                          className="px-2 py-1 bg-[#db2777]/20 border border-[#db2777]/30 rounded"
                        >
                          {value as string}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-[#db2777] to-[#fbbf24] border-2 border-white font-black text-lg tracking-wider hover:scale-105 transition-transform disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader className="animate-spin" size={20} />
                      LOADING...
                    </span>
                  ) : (
                    'LOAD MORE'
                  )}
                </button>
              </div>
            )}

            {!hasMore && stands.length > 0 && (
              <p className="text-center text-gray-500 mt-8">
                ✨ You've seen all {stands.length} Stands!
              </p>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedStand && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedStand(null)}
        >
          <div 
            className="bg-gradient-to-b from-[#1a0b2e] to-[#0f0015] border-4 border-[#fbbf24] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-black border-b-2 border-[#db2777] p-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedStand.pfp_url}
                  alt={selectedStand.display_name}
                  className="w-10 h-10 rounded-full border-2 border-[#fbbf24]"
                />
                <div>
                  <p className="font-bold">{selectedStand.display_name}</p>
                  <p className="text-sm text-gray-400">@{selectedStand.username}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStand(null)}
                className="text-2xl hover:text-[#db2777] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Image */}
            <div className="p-4">
              {selectedStand.stand_image_url && (
                <img 
                  src={selectedStand.stand_image_url}
                  alt={selectedStand.stand_name}
                  className="w-full rounded-lg border-2 border-[#db2777]"
                />
              )}
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-3xl font-black text-[#fbbf24] mb-2">
                  {selectedStand.stand_name}
                </h2>
                <p className="text-gray-300">{selectedStand.stand_description}</p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#db2777] mb-1">Ability:</h3>
                <p className="text-gray-300">{selectedStand.ability}</p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#db2777] mb-1">Battle Cry:</h3>
                <p className="text-[#fbbf24] font-black text-xl italic">
                  "{selectedStand.battle_cry}"
                </p>
              </div>

              {/* Stats */}
              <div>
                <h3 className="text-lg font-bold text-[#db2777] mb-2">Stats:</h3>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(selectedStand.stats || {}).map(([key, value]) => (
                    <div 
                      key={key}
                      className="bg-black/50 border border-[#db2777]/30 rounded p-2 text-center"
                    >
                      <p className="text-xs text-gray-400 uppercase">{key}</p>
                      <p className="text-2xl font-black text-[#fbbf24]">{value as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
