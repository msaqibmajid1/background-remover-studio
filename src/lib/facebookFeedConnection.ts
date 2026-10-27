type FeedTarget = {id: string; name: string};
type Connection = {sessionId: string; target: FeedTarget; source?: 'page' | 'group'};
type PrepareRequest = (type: string, payload: Record<string, unknown>) => Promise<Connection>;

export async function connectFacebookFeed(
  request: PrepareRequest,
  source: {url: string; mode: string; targetId: string},
): Promise<Connection> {
  // A previous target belongs to its previous URL, never the newly pasted one.
  return request('FACEBOOK_FEED_PREPARE', {...source, targetId: ''});
}
