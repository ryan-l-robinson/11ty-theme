<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
    <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
    <xsl:template match="/">
        <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <title>XML Sitemap</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <style type="text/css">
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
                        color: #333;
                    }
                    #sitemap {
                        width: 100%;
                        max-width: 800px;
                        margin: 2em auto;
                        border-collapse: collapse;
                        border: 1px solid #ccc;
                    }
                    #sitemap th, #sitemap td {
                        padding: 12px 15px;
                        text-align: left;
                    }
                    #sitemap thead {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    #sitemap tbody tr {
                        border-bottom: 1px solid #ddd;
                    }
                    #sitemap tbody tr:hover {
                        background-color: #f5f5f5;
                    }
                    a {
                        color: #0073aa;
                        text-decoration: none;
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <div id="content">
                    <h1>XML Sitemap</h1>
                    <p>This is an XML sitemap, primarily intended for search engines.</p>
                    <table id="sitemap">
                        <thead>
                            <tr>
                                <th>URL</th>
                                <th>Last Modified</th>
                            </tr>
                        </thead>
                        <tbody>
                            <xsl:for-each select="sitemap:urlset/sitemap:url">
                                <tr>
                                    <td>
                                        <xsl:variable name="loc" select="sitemap:loc"/>
                                        <a href="{$loc}"><xsl_value-of select="sitemap:loc"/></a>
                                    </td>
                                    <td>
                                        <xsl:value-of select="sitemap:lastmod"/>
                                    </td>
                                </tr>
                            </xsl:for-each>
                        </tbody>
                    </table>
                </div>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>
