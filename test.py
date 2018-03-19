# -*- coding: utf-8 -*-
#import httplib
#conn = httplib.HTTPSConnection("www.google.com")
#conn.request("GET", "/")
#response = conn.getresponse()
#json_str = response.read()
#conn.close()
#print(json_str)


import urlparse
import httplib
import base64

#proxy_uri = "http://user:password@proxy_host:proxy_port"
proxy_host = "127.0.0.1"
proxy_port = 8118
host = 'www.google.com'
port = 443

#url = urlparse.urlparse(proxy_uri)
conn = httplib.HTTPSConnection(proxy_host, proxy_port)
#headers = {}
#if url.username and url.password:
#    auth = '%s:%s' % (url.username, url.password)
#    headers['Proxy-Authorization'] = 'Basic ' + base64.b64encode(auth)

#conn.set_tunnel(host, port, headers)
conn.set_tunnel(host, port)
conn.request("GET", "/")
response = conn.getresponse()
print response.status, response.reason
output = response.read()

print(output)
