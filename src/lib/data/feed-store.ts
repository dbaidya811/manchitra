import fs from 'fs';
import path from 'path';

export type FeedPost = {
  id: string;
  author?: string;
  avatarUrl?: string | null;
  cardName: string;
  text: string;
  photos: string[];
  createdAt: number | string;
  updatedAt?: number | string | null;
  edited?: boolean;
  likes: number;
  likedBy?: string[]; // list of emails
  ownerEmail?: string | null;
};

type FeedData = {
  posts: FeedPost[];
};

const dataDir = path.join(process.cwd(), '.data');
const feedPath = path.join(dataDir, 'feed.json');

function ensureFile() {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(feedPath)) {
      fs.writeFileSync(feedPath, JSON.stringify({ posts: [] } as FeedData, null, 2), 'utf-8');
    }
  } catch {
    // noop
  }
}

export async function readFeed(): Promise<FeedData> {
  ensureFile();
  try {
    const raw = await fs.promises.readFile(feedPath, 'utf-8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !Array.isArray(data.posts)) return { posts: [] };
    return data as FeedData;
  } catch {
    return { posts: [] };
  }
}

export async function writeFeed(data: FeedData): Promise<void> {
  ensureFile();
  await fs.promises.writeFile(feedPath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function upsertPost(post: FeedPost): Promise<void> {
  const data = await readFeed();
  const idx = data.posts.findIndex(p => String(p.id) === String(post.id));
  if (idx >= 0) data.posts[idx] = post; else data.posts.unshift(post);
  await writeFeed(data);
}

export async function deletePost(id: string): Promise<boolean> {
  const data = await readFeed();
  const before = data.posts.length;
  data.posts = data.posts.filter(p => String(p.id) !== String(id));
  await writeFeed(data);
  return data.posts.length < before;
}

export async function getPost(id: string): Promise<FeedPost | null> {
  const data = await readFeed();
  return data.posts.find(p => String(p.id) === String(id)) || null;
}
