import json
import os

# Define NEWS_SOURCES (move this to a shared module if reused)
NEWS_SOURCES = {
    'bbc': {'name': 'BBC News', 'feeds': {'general': 'https://feeds.bbci.co.uk/news/rss.xml', ...}},
    'cnn': {'name': 'CNN', 'feeds': {'general': 'http://rss.cnn.com/rss/edition.rss', ...}},
    'reuters': {'name': 'Reuters', 'feeds': {'general': 'https://www.reutersagency.com/feed/', ...}},
    'nytimes': {'name': 'New York Times', 'feeds': {'general': 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', ...}},
    'guardian': {'name': 'The Guardian', 'feeds': {'general': 'https://www.theguardian.com/international/rss', ...}}
}

def handler(request):
    sources = [{'id': sid, 'name': info['name'], 'categories': list(info['feeds'].keys())} for sid, info in NEWS_SOURCES.items()]
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(sources)
    }