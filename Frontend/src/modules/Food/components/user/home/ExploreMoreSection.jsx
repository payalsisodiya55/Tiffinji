import { Link } from "react-router-dom";
import { ExploreGridSkeleton } from "@food/components/ui/loading-skeletons";
import OptimizedImage from "@food/components/OptimizedImage";

export default function ExploreMoreSection({
  heading = "Explore More",
  items = [],
  showSkeleton = false,
}) {
  return (
    <section className="content-auto py-1 sm:py-2">
      <div className="px-4 mb-2 flex items-center gap-2">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
          {heading}
        </h2>
        <div className="h-[1px] bg-gray-100 dark:bg-gray-800 flex-1" />
      </div>
      <div className="px-4 pb-2">
        <div className="flex overflow-x-auto no-scrollbar gap-4 sm:gap-6 items-start justify-center py-1">
          {showSkeleton
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`explore-skel-${index}`}
                  className="flex-shrink-0 w-14 sm:w-16 md:w-20"
                >
                  <ExploreGridSkeleton count={1} />
                </div>
              ))
            : items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex-shrink-0 w-14 sm:w-16 md:w-20 transition-transform duration-300 hover:-translate-y-1 active:scale-95"
                  style={{
                    animation: `fade-in-up 0.4s ease-out ${index * 0.08}s backwards`,
                  }}
                >
                  <Link to={item.href} className="block w-full">
                    <div className="flex flex-col items-center gap-1.5 w-full group">
                      <div className="relative w-full aspect-square rounded-2xl bg-white dark:bg-[#1a1a1a] flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-800 group-hover:border-primary/40">
                        <div
                          className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br ${
                            index % 3 === 0
                              ? "from-primary to-amber-500"
                              : index % 3 === 1
                                ? "from-amber-500 to-yellow-500"
                                : "from-yellow-500 to-orange-500"
                          } z-20 pointer-events-none`}
                        />
                        <OptimizedImage
                          src={item.image}
                          alt={item.label}
                          className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-105"
                          width={120}
                          height={120}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 group-hover:text-primary dark:group-hover:text-white transition-colors text-center tracking-tight leading-tight uppercase px-0.5">
                        {item.label}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
