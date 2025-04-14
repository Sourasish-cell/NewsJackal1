import json
import os
import requests
import xmltodict
from bs4 import BeautifulSoup
import random
import time
import threading
from datetime import datetime

# Define shared constants
CACHE_DIR = os.path.join(os.path.dirname(__file__), 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)
NEWS_SOURCES = {...}  # Same as above
FALLBACK_IMAGES = ["https://wallpapercave.com/wp/wp7939960.jpg", ...]
news_cache = {}
cache_lock = threading.Lock()
CACHE_EXPIRATION = 15 * 60

def get_nested_value(obj, key):
    if not obj or not isinstance(obj, dict): return None
    if key in obj: return obj[key]
    for k in obj: 
        if k.endswith(':' + key) or k == key: return obj[k]
    return None

def extract_image_from_content(article):
    media_content = get_nested_value(article, 'media:content') or get_nested_value(article, 'media:thumbnail')
    if media_content and isinstance(media_content, dict) and '@url' in media_content: return media_content['@url']
    # ... (rest of the function, simplified)
    return random.choice(FALLBACK_IMAGES)

def extract_summary(text, max_chars=220):
    if not text: return "No description available"
    sentences = text.split('. ')
    return sentences[0][:max_chars] + ("..." if len(sentences[0]) > max_chars else "")

def fetch_articles_from_rss(feed_url, source_id, source_name):
    response = requests.get(feed_url, timeout=10)
    data = xmltodict.parse(response.content)
    articles = data.get('rss', {}).get('channel', {}).get('item', []) or data.get('feed', {}).get('entry', [])
    if not isinstance(articles, list): articles = [articles]
    transformed = []
    for article in articles:
        title = get_nested_value(article, 'title')
        if isinstance(title, dict): title = title.get('#text', '')
        link = get_nested_value(article, 'link')
        if isinstance(link, dict): link = link.get('@href', '')
        description = get_nested_value(article, 'description') or get_nested_value(article, 'summary') or ''
        if isinstance(description, dict): description = description.get('#text', '')
        pub_date = get_nested_value(article, 'pubDate') or get_nested_value(article, 'published') or ''
        image_url = extract_image_from_content(article)
        clean_text = BeautifulSoup(description, 'html.parser').text.strip()
        transformed.append({
            'source': {'id': source_id, 'name': source_name},
            'author': get_nested_value(article, 'author') or source_name,
            'title': title or "No Title Available",
            'description': extract_summary(clean_text),
            'url': link,
            'urlToImage': image_url,
            'publishedAt': pub_date,
            'content': clean_text
        })
    return transformed

def get_from_cache(key):
    with cache_lock:
        if key in news_cache and time.time() - news_cache[key][1] < CACHE_EXPIRATION:
            return news_cache[key][0]
    return None

def save_to_cache(key, data):
    with cache_lock:
        news_cache[key] = (data, time.time())

def handler(request):
    category = request.query.get('category', 'general').lower()
    source = request.query.get('source', '')
    page = int(request.query.get('page', 1))
    page_size = int(request.query.get('pageSize', 9))

    sources_to_fetch = [source] if source in NEWS_SOURCES else list(NEWS_SOURCES.keys())
    all_articles = []

    cache_key = f"{'-'.join(sources_to_fetch)}-{category}"
    cached_data = get_from_cache(cache_key)
    if cached_data:
        all_articles = cached_data
    else:
        for source_id in sources_to_fetch:
            source_info = NEWS_SOURCES.get(source_id)
            if not source_info: continue
            feed_url = source_info['feeds'].get(category, source_info['feeds'].get('general', ''))
            if feed_url:
                try:
                    all_articles.extend(fetch_articles_from_rss(feed_url, source_id, source_info['name']))
                except Exception as e:
                    print(f"Error fetching from {source_id}: {e}")
        all_articles.sort(key=lambda x: x.get('publishedAt', ''), reverse=True)
        save_to_cache(cache_key, all_articles)

    total_results = len(all_articles)
    start_idx = (page - 1) * page_size
    end_idx = min(start_idx + page_size, total_results)
    paginated_articles = all_articles[start_idx:end_idx]

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({"status": "ok", "totalResults": total_results, "articles": paginated_articles})
    }