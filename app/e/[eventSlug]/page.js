import GuestSubmitPage from '../../event/[eventId]/submit/page';

export default function GuestSlugPage({ params }) {
  return <GuestSubmitPage params={{ eventId: params.eventSlug }} />;
}
