var requirejs = require('requirejs');

requitejs.config({
  nodeRequire: require
});

requirejs(['./graph.js', 'socket.io'],
function  (g           , soc)
{
    var io = soc.listen(8080);

    var graphs = [];
    var graphlisteners = [];

    function getGraph(graphName)
    {

	if(!graphs[graphName])
	{
	    graphs[graphName] = g.init();
	}
	return graphs[graphName];
    }

    function removeListener(name, socket)
    {
	if(name && socket)
	{
	    graphlisteners[name].splice(graphlisteners.indexOf(socket), 1);
	}
    }

    function addListener(name, socket)
    {
	if(!graphlisteners[name])
	    graphlisteners[name] = [socket];
	else
	    graphlisteners[name].push(socket);
    }

    io.sockets.on('connection', function (socket) {
	var graph, graphName;
	subscribe('default');
	function subscribe(name)
	{
	    if(name)
	    {
		removeListener(graphName, socket);
		graphName = name;
		graph = getGraph(graphName);
		addListener(name, socket);
	    }
	}
	socket.on('select', function(selection){
	    subscribe(selection);
	    socket.emit('setgraph', graph.data);
	});
	socket.on('action', function (action) {
	    var res = graph.baseAction(action);
	    if(res)
	    {
		graphlisteners[graphName].foreach(function(l){
		    l.emit('action', res);
		});
	    }
	});
	socket.on('disconnect', function () {
	    removeListener(graphName);
	});
});

}
