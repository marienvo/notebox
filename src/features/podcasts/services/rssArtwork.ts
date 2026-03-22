import {XMLParser} from 'fast-xml-parser';

const xmlParser = new XMLParser({
  attributeNamePrefix: '@_',
  ignoreAttributes: false,
});

type ParsedNode = Record<string, unknown>;

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function asObject(value: unknown): ParsedNode | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as ParsedNode;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function getFirstAttributeValue(
  nodes: unknown,
  attribute: string,
): string | null {
  for (const node of toArray(nodes)) {
    const parsedNode = asObject(node);
    if (!parsedNode) {
      continue;
    }

    const value = asString(parsedNode[attribute]);
    if (value) {
      return value;
    }
  }

  return null;
}

function getRssChannel(xml: string): ParsedNode | null {
  const parsed = xmlParser.parse(xml) as ParsedNode;
  const rss = asObject(parsed.rss);
  if (rss) {
    return asObject(rss.channel);
  }

  // Some feeds use Atom as the root element.
  const atomFeed = asObject(parsed.feed);
  return atomFeed;
}

function resolveChannelImageUrl(channel: ParsedNode): string | null {
  const itunesImageUrl = getFirstAttributeValue(channel['itunes:image'], '@_href');
  if (itunesImageUrl) {
    return itunesImageUrl;
  }

  const channelImage = asObject(channel.image);
  const channelImageUrl = channelImage ? asString(channelImage.url) : null;
  if (channelImageUrl) {
    return channelImageUrl;
  }

  const mediaThumbnailUrl = getFirstAttributeValue(
    channel['media:thumbnail'],
    '@_url',
  );
  if (mediaThumbnailUrl) {
    return mediaThumbnailUrl;
  }

  const googlePlayImageUrl = getFirstAttributeValue(
    channel['googleplay:image'],
    '@_href',
  );
  if (googlePlayImageUrl) {
    return googlePlayImageUrl;
  }

  return null;
}

export async function fetchRssArtworkUrl(
  rssFeedUrl: string,
  timeoutMs = 10000,
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(rssFeedUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }

    const xml = await response.text();
    if (!xml.trim()) {
      return null;
    }

    const channel = getRssChannel(xml);
    if (!channel) {
      return null;
    }

    return resolveChannelImageUrl(channel);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutHandle);
  }
}
