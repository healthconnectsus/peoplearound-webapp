import { NeighborhoodMap, type MapPin } from "@/components/NeighborhoodMap";
import { createClient } from "@/lib/supabase/server";
import { myMapCenter } from "@/lib/mapPins";

/**
 * The split app shell: content scrolls on the left, the map sits sticky and
 * full-height on the right. Used by every "what's around me" page so the
 * neighborhood is always visible as a *place*, not just a list.
 *
 * With no pins it renders the content full width — an empty map gutter is
 * worse than no map.
 */
export async function MapShell({
  pins,
  children,
}: {
  pins: MapPin[];
  children: React.ReactNode;
}) {
  if (pins.length === 0) return <>{children}</>;

  // Resolved here rather than by each page: every map on the site should
  // frame the same place, and threading it through eight call sites would
  // guarantee one of them eventually forgets.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const center = user ? await myMapCenter(supabase, user.id) : null;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_50%] xl:grid-cols-[minmax(0,1fr)_53%]">
      <aside className="p-4 pb-0 lg:order-2 lg:sticky lg:top-0 lg:h-screen lg:p-4">
        <NeighborhoodMap
          pins={pins}
          center={center}
          className="h-64 lg:h-full"
        />
      </aside>
      <div className="min-w-0 lg:order-1">{children}</div>
    </div>
  );
}
