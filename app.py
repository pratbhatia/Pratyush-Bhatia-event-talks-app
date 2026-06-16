import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to avoid spamming the XML feed on every page load
_cache = {
    "data": None,
    "last_fetched": None
}

def parse_release_notes_xml(xml_content):
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        print(f"XML parsing error: {e}")
        return []
    
    entries = []
    
    for entry in root.findall('atom:entry', namespaces):
        title_elem = entry.find('atom:title', namespaces)
        updated_elem = entry.find('atom:updated', namespaces)
        content_elem = entry.find('atom:content', namespaces)
        link_elem = entry.find('atom:link', namespaces)
        
        date_str = title_elem.text.strip() if title_elem is not None else ""
        updated_str = updated_elem.text.strip() if updated_elem is not None else ""
        raw_html = content_elem.text if content_elem is not None else ""
        link_url = ""
        if link_elem is not None:
            link_url = link_elem.attrib.get('href', '')
            
        # Parse the raw HTML into sub-items by <h3> tags
        updates = []
        if raw_html:
            pattern = r'<h3>(.*?)</h3>'
            matches = list(re.finditer(pattern, raw_html))
            
            for i, match in enumerate(matches):
                type_name = match.group(1).strip()
                start_pos = match.end()
                end_pos = matches[i+1].start() if i + 1 < len(matches) else len(raw_html)
                detail_html = raw_html[start_pos:end_pos].strip()
                
                updates.append({
                    "type": type_name,
                    "content": detail_html
                })
            
            if not updates and raw_html.strip():
                updates.append({
                    "type": "General",
                    "content": raw_html.strip()
                })
                
        entries.append({
            "date": date_str,
            "updated": updated_str,
            "link": link_url,
            "updates": updates
        })
        
    return entries

def fetch_feed_data(force_refresh=False):
    global _cache
    now = datetime.now()
    
    # Return cache if it is fresh (within 10 minutes) and not force_refresh
    if (not force_refresh and 
        _cache["data"] is not None and 
        _cache["last_fetched"] is not None and 
        (now - _cache["last_fetched"]).total_seconds() < 600):
        return _cache["data"]
        
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
            
        parsed_entries = parse_release_notes_xml(xml_data)
        if parsed_entries:
            _cache["data"] = parsed_entries
            _cache["last_fetched"] = now
            return parsed_entries
    except Exception as e:
        print(f"Error fetching feed: {e}")
        if _cache["data"] is not None:
            return _cache["data"]
        raise e
        
    return []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data = fetch_feed_data(force_refresh=force_refresh)
        return jsonify({
            "status": "success",
            "last_updated": _cache["last_fetched"].isoformat() if _cache["last_fetched"] else None,
            "data": data
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
