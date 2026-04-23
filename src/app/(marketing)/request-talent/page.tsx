
{/*Before integrating page and request talent 
import { Suspense } from 'react';
import RequestTalentClient from './request-talent-client';

export default function RequestTalentPage() {
  return (
    <Suspense fallback={null}>
      <RequestTalentClient />
    </Suspense>
  );
}
*/}

import Home from '../page';

export default function RequestTalentPage(props: any) {
  return <Home {...props} />;
}