import LiveProjectionWall from '../../../wall/[eventSlug]/page';

export default function WallRoute({ params }) {
  return <LiveProjectionWall params={{ eventSlug: params.eventId }} />;
}