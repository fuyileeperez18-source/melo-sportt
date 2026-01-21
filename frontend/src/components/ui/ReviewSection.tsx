import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { Review } from '@/types';

interface ReviewSectionProps {
  productId: string;
  reviews?: Review[];
  averageRating?: number;
  totalReviews?: number;
}

// Mock reviews data
const mockReviews: Review[] = [
  {
    id: '1',
    product_id: '1',
    user_id: '1',
    user: { id: '1', email: 'maria@email.com', full_name: 'María García', role: 'customer', created_at: '', updated_at: '' },
    rating: 5,
    title: 'Excelente calidad',
    content: 'La camiseta es de muy buena calidad, el material es suave y cómodo. El envío fue rápido y llegó en perfectas condiciones. Definitivamente volveré a comprar.',
    is_verified_purchase: true,
    helpful_count: 12,
    created_at: '2025-01-15T10:00:00Z',
  },
  {
    id: '2',
    product_id: '1',
    user_id: '2',
    user: { id: '2', email: 'carlos@email.com', full_name: 'Carlos Rodríguez', role: 'customer', created_at: '', updated_at: '' },
    rating: 4,
    title: 'Muy buen producto',
    content: 'Me gustó mucho la calidad del producto. Solo le quito una estrella porque la talla quedó un poco más grande de lo esperado.',
    is_verified_purchase: true,
    helpful_count: 8,
    created_at: '2025-01-10T14:30:00Z',
  },
  {
    id: '3',
    product_id: '1',
    user_id: '3',
    user: { id: '3', email: 'ana@email.com', full_name: 'Ana Martínez', role: 'customer', created_at: '', updated_at: '' },
    rating: 5,
    title: '¡Lo recomiendo!',
    content: 'Increíble relación calidad-precio. El diseño es exactamente como se ve en las fotos y el material es de primera.',
    is_verified_purchase: true,
    helpful_count: 5,
    created_at: '2025-01-05T09:15:00Z',
  },
];

const ratingDistribution = [
  { stars: 5, count: 45, percentage: 60 },
  { stars: 4, count: 20, percentage: 27 },
  { stars: 3, count: 7, percentage: 9 },
  { stars: 2, count: 2, percentage: 3 },
  { stars: 1, count: 1, percentage: 1 },
];

export function ReviewSection({ productId, reviews = mockReviews, averageRating = 4.5, totalReviews = 75 }: ReviewSectionProps) {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 0, title: '', content: '' });
  const [hoverRating, setHoverRating] = useState(0);

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Submit review to backend
    console.log('Submitting review:', newReview);
    setIsWritingReview(false);
    setNewReview({ rating: 0, title: '', content: '' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <section className="py-12 border-t border-primary-800">
      <div className="container mx-auto px-6">
        <h2 className="text-2xl font-bold text-white mb-8">Reseñas de Clientes</h2>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Rating Summary */}
          <div className="lg:col-span-1">
            <div className="bg-primary-900 rounded-2xl p-6 border border-primary-800">
              <div className="text-center mb-6">
                <p className="text-5xl font-bold text-white mb-2">{averageRating}</p>
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'h-6 w-6',
                        star <= Math.round(averageRating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-600'
                      )}
                    />
                  ))}
                </div>
                <p className="text-gray-400">{totalReviews} reseñas</p>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-3">
                {ratingDistribution.map(({ stars, count, percentage }) => (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-8">{stars} ★</span>
                    <div className="flex-1 h-2 bg-primary-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-8">{count}</span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full mt-6"
                onClick={() => setIsWritingReview(!isWritingReview)}
              >
                Escribir una Reseña
              </Button>
            </div>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2">
            {/* Write Review Form */}
            <AnimatePresence>
              {isWritingReview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-8"
                >
                  <form onSubmit={handleSubmitReview} className="bg-primary-900 rounded-2xl p-6 border border-primary-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Escribe tu Reseña</h3>

                    {/* Star Rating Input */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Tu Calificación</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReview({ ...newReview, rating: star })}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={cn(
                                'h-8 w-8 transition-colors',
                                star <= (hoverRating || newReview.rating)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-600'
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Título</label>
                      <input
                        type="text"
                        value={newReview.title}
                        onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                        placeholder="Resume tu experiencia"
                        className="w-full h-11 px-4 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <Textarea
                        label="Tu Reseña"
                        value={newReview.content}
                        onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
                        placeholder="Cuéntanos más sobre tu experiencia con este producto..."
                        required
                      />
                    </div>

                    <div className="flex gap-4">
                      <Button type="button" variant="outline" onClick={() => setIsWritingReview(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={newReview.rating === 0}>
                        Publicar Reseña
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reviews */}
            <div className="space-y-6">
              {displayedReviews.map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary-900 rounded-2xl p-6 border border-primary-800"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-800 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{review.user?.full_name}</p>
                        <p className="text-sm text-gray-400">{formatDate(review.created_at)}</p>
                      </div>
                    </div>
                    {review.is_verified_purchase && (
                      <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                        Compra Verificada
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          'h-4 w-4',
                          star <= review.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-600'
                        )}
                      />
                    ))}
                  </div>

                  <h4 className="font-semibold text-white mb-2">{review.title}</h4>
                  <p className="text-gray-300 mb-4">{review.content}</p>

                  <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                    <ThumbsUp className="h-4 w-4" />
                    Útil ({review.helpful_count})
                  </button>
                </motion.div>
              ))}
            </div>

            {reviews.length > 3 && (
              <button
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="w-full mt-6 py-3 text-white flex items-center justify-center gap-2 hover:bg-primary-900 rounded-lg transition-colors"
              >
                {showAllReviews ? (
                  <>
                    Ver Menos <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Ver Todas las Reseñas ({reviews.length}) <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
