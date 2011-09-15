var requirejs = require('requirejs');

requirejs.config({
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
			  socket.emit('setgraph', graph.data);
		      }
		  }
		  socket.on('select', function(selection){
		      subscribe(selection);
		  });
		  socket.on('action', function (action) {
		      console.log(action);
		      var res = graph.baseAction(action);
		      console.log('res: ' +  res);
		      if(res)
		      {
//			  socket.emit('action', res);
//			  socket.broadcast.emit('action', res);
			  graphlisteners[graphName].forEach(function(l){
			      l.emit('action', res);
			  });
		      }
		  });
		  socket.on('disconnect', function () {
		      removeListener(graphName);
		  });
	      });
	  });
