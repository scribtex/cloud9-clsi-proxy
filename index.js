/**
 * CLSI Proxy for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
var Plugin = require("cloud9/plugin");
var sys    = require("sys");
var url    = require("url");
var http   = require("http");

var ShellGitPlugin = module.exports = function(ide) {
    this.ide = ide;
    this.hooks = [];
    this.name = "clsi-proxy";
    this.establishProxy("http://localhost:3000");
};

sys.inherits(ShellGitPlugin, Plugin);

(function() {
    this.establishProxy = function(clsiUrl) {
        this.ide.httpServer.use(function(req, res, next) {
            if (req.url.match("^/clsi")) {
                // Remove /clsi from beginning of url and any leading slash
                var path   = req.url.slice(5, req.url.length);
                if (path[0] == "/")
                    path = path.slice(1, path.length);
                  
                var backendUrl = url.parse(clsiUrl + "/" + path);
                
                var port = backendUrl.port;
                if (!port) {
                    if (backendUrl.protocol == "http:") port = 80;
                    else if (backendUrl.protocol == "https:") port = 443;
                    else port = 80;
                }
                
                var client = http.createClient(port, backendUrl.hostname);
                var backendReq = client.request(
                                         req.method,
                                         backendUrl.pathname + (backendUrl.search || ""),
                                         req.headers
                                     );

                backendReq.on("response", function(backendRes) {
                    backendRes.on("data", function(chunk) {
                        res.write(chunk, "binary");
                    });
                    backendRes.on("end", function() {
                        res.end();
                    });
                    res.writeHead(backendRes.statusCode, backendRes.headers);
                });
                
                req.on("data", function(chunk) {
                    backendReq.write(chunk, "binary");
                });
                req.on("end", function() {
                    backendReq.end();
                });
            } else {
                next();
            }
        });
    };
}).call(ShellGitPlugin.prototype);