
require(["src/graph"], function(graphMod) {


    require.ready(function() {

	var graph = graphMod.init();

	var w = 960,     // svg width
     h = 600,     // svg height
     dr = 4,      // default point radius
     off = 15,    // cluster hull offset
     expand = {}, // expanded clusters
     data = graph.data,
     net, force, hullg, hull, linkg, link, nodeg, node,
     curve = d3.svg.line().interpolate("cardinal-closed").tension(.85),
     fill = d3.scale.category20();


	var body = d3.select("body");
	var vis = d3.select("#viz").append("svg:svg");
	var rect = vis.append("svg:rect")
	    .on("keypress", function() {
		if(d3.event.charCode == 'g'){
		var point = d3.svg.mouse(vis[0][0]);
		deselect();
		}
	    })
//	    .on("click", function(){deselect();})
	    .on("click", function() {
		var e = d3.event;
		var point = d3.svg.mouse(vis[0][0]);
		if(d3.event.ctrlKey){
		    socket.emit('action', [{name:'createGroup',
					    params:[point[0], point[1]]}]);
		}
		else {
		    socket.emit('action', [{name:'createNode',
					    params:[point[0], point[1]]}]);
		}
		deselect();
	    });

	var settings = {
	    gravity:0.2,
	    charge:-50,
	    distance:100,
	    scale:1,
	    friction:0.1,
	    strength:1
	};

	var sys = {
	    parameters:function(newParams){
		if (newParams!==undefined){
		    if (!isNaN(newParams.precision)){
			newParams.precision = Math.max(0, Math.min(1, newParams.precision));
		    }
		    $.each(settings, function(p, v){
			if (newParams[p]!==undefined) settings[p] = newParams[p];
		    });
		    init();
		}
		return settings;
	    }
	};


	var dashboard = Dashboard("#dashboard", sys);

	var selected = false;
	var selectedShape = false;

	function deselect()
	{
	    if(selected)
	    {
		selected = false;
		highlight(selectedShape, 1.5);
		selectedShape = false;
		selectedShape.style["stroke"] = "#fff";
	    }
	}

	function select(d, shape)
	{
	    selected = d;
	    selectedShape = shape;
	    highlight(shape, 3);
            selectedShape.style["stroke"] = "#fdd017";
	}

	function highlight(shape, amnt)
	{
	    shape.style["stroke-width"] = amnt + "px";
	}


	hullg = vis.append("svg:g");
	linkg = vis.append("svg:g");
	nodeg = vis.append("svg:g");

	$(window).resize(init);

	init();

	function noop() { return false; }

	function nodeid(n) {
	    return n.size ? "_g_"+n.group : n.name;
	}

	function linkid(l) {
	    var u = nodeid(l.source),
	 v = nodeid(l.target);
	    return u<v ? u+"|"+v : v+"|"+u;
	}

	function isVisible(node)
	{
	    return true;
	    if(node.group) return node.visble && isVisible(node.group);
	    return node.visible;
	}

	function getVisible(node)
	{
	    if(node){
		if(isVisible(node)) return node;
		return getVisible(node.group);
	    }
	    return false;
	}

	function getGroup(node)
	{
	    return graph.getGroup(node.group);
	}

	// constructs the network to visualize
	function network(data, prev, expand) {
	    expand = expand || {};
	    var gm = {},    // group map
	 nm = {},    // node map
	 lm = {},    // link map
	 gn = {},    // previous group nodes
	 nodes = [], // output nodes
	 links = []; // output links

	    data.groups.forEach(function(group){
		if(isVisible(group)){
		    nm[group] = nodes.length;
		    nodes.push(group);
		    group.size = 0;
		    var parent = getGroup(group);
		    if(parent)
		    {
			links.push({source:group,
				    target:parent,
				    strength:parent.strength,
				    size:0});
		    }
		}
//		else {
//		    var p = getVisible(group);
//		    if(p)
	    });

	    // determine nodes
	    data.nodes.forEach(function(node){
		if(isVisible(node)) {
		    nm[node] = nodes.length;
		    nodes.push(node);
		    var group = getGroup(node);
		    if(group){
			links.push({source:node,
				    target:group,
				    strength:group.strength,
				    size:0});
		    }
		}
//		else {
//		}
	    });

	    data.links.forEach(function(l){
		var u = data.nodes[l.source],
		v = data.nodes[l.target];
//TODO: implement properly
		links.push({source:u, target:v});
	    });


	    return {nodes: nodes, links: links};
	}

	function convexHulls(nodes, offset) {
	    var h = {};

	    // create point sets
	    nodes.forEach(function(n){
		if(n.isgroup) insertPoint(h, n.id, n, offset);
		var g = getGroup(n);
		var i = 0;
		while(g){
		    insertPoint(h, g.id, n, offset + (i++) * 2);
		    g = getGroup(g);
		}
	    });
	    // create convex hulls
	    var hulls = [];
	    for (var i in h) {
		hulls.push({group: i, path: d3.geom.hull(h[i])});
	    }

	    return hulls;
	}

	function insertPoint(h, g, n, offset)
	{
	    if(g){
		var l = h[g] || (h[g] = []);
		l.push([n.x-offset, n.y-offset]);
		l.push([n.x-offset, n.y+offset]);
		l.push([n.x+offset, n.y-offset]);
		l.push([n.x+offset, n.y+offset]);
	    }
	}

	function drawCluster(d) {
	    return curve(d.path); // 0.8
	}

	// --------------------------------------------------------

	var socket = io.connect('http://kangaloon:8080');
	socket.on('connect', function () {
	    if(window.location.hash)
	    {
		socket.emit('select', window.location.hash);
	    }
	    socket.on('setgraph', function(graphData){
		graph.setData(graphData);
		data = graph.data;
		init();
	    });
	    socket.on('action', function (action) {
		graph.clientAction(action);
		init();
	    });
	});



	function init() {
	    if (force) force.stop();

	    net = network(data, net, expand);

	    var v = vis[0][0];
	    
	    w = v.clientWidth;
	    h = v.clientHeight;
	    
	    rect.attr("width", w).attr("height", h);

	    force = d3.layout.force()
		.nodes(net.nodes)
		.links(net.links)
		.size([w, h])
		.linkDistance(settings.distance)
		.charge(settings.charge)
		.friction(1 - settings.friction)
		.gravity(settings.gravity/10)
		.linkStrength(function(l){ return l.strength ?l.strength : settings.strength;})
		.start();
	    

	    hullg.selectAll("path.hull").remove();
	    hull = hullg.selectAll("path.hull")
		.data(convexHulls(net.nodes, off))
		.enter().append("svg:path")
		.attr("class", "hull")
		.attr("d", drawCluster)
		.style("fill", function(d) { return fill(d.group); })
		.on("dblclick", function(d) { expand[d.group] = false; init(); })
		.on("mouseover", function(d) {
      		    if(selected)
      		    {
      	  		this.style["stroke"] = "#fdd017";
      		    }
      		})
		.on("mouseout", function(d) {
      	  	    this.style["stroke"] = "none";
      		})
		.on("click", function(d) {
		    if(selected)
		    {
			d3.event.cancelBubble = true;
			if(selected.isgroup){
			    socket.emit('action', [{name:'setParent',
						    params:[selected.id, d.group]}]);
			}
			else {
			    socket.emit('action', [{name:'addToGroup',
						    params:[selected.id, d.group]}]);
			}
			deselect();
		    }
		});
	    ;
	    
	    
	    link = linkg.selectAll("line.link").data(net.links, linkid);
	    link.exit().remove();
	    link.enter().append("svg:line")
		.attr("class", "link")
		.attr("x1", function(d) { return d.source.x; })
		.attr("y1", function(d) { return d.source.y; })
		.attr("x2", function(d) { return d.target.x; })
		.attr("y2", function(d) { return d.target.y; })
		.style("stroke-width", function(d) { return d.size || 1; })
.style("stroke-dasharray", function(d) { return d.source.isgroup || d.target.isgroup?
					     "5, 2" : "none";});
	    
	    link = linkg.selectAll("line.link");

	    node = nodeg.selectAll("circle.node").data(net.nodes, nodeid);
	    node.exit().remove();
	    node.enter().append("svg:circle")
		.attr("class", function(d) { return "node" + (d.size?"":" leaf"); })
		.attr("r", function(d) { return 2*(d.size ? d.size + dr : dr+1); })
		.attr("cx", function(d) { return d.x; })
		.attr("cy", function(d) { return d.y; })
//		.style("fill", function(d) { return fill(d.group); })
		.style("fill", function(d) { return d.isgroup ? fill(d.id) : "#1f77b4";})
		.on("mouseover", function(d) {
      		    if(selected != d)
      		    {
      			highlight(this, 3);
      		    }
      		})
		.on("mouseout", function(d) {
      		    if(selected != d)
      		    {
      			highlight(this, 1.5);
      		    }
      		})
		.on("dblclick", function(d) {
		    if (d.size) { expand[d.group] = true; init(); }
		})
		.on("click", function(d) {
		    d3.event.cancelBubble = true;
		    if(selected)
		    {
			if(selected.isgroup && d.isgroup){
			    socket.emit('action', graph.buildAction('setParent', selected.id, d.id));
			}
			else if (d.isgroup) {
			    socket.emit('action', graph.buildAction('addToGroup', selected.id, d.id));
			}
			else if (selected.isgroup) {
			    socket.emit('action', graph.buildAction('addToGroup', d.id, selected.id));
			}
			else {
			    socket.emit('action', [{name:'createLink',
						    params:[selected.id, d.id]}]);
			}
			deselect();
		    }
		    else
		    {
			select(d, this);
		    }
		});

	    node = nodeg.selectAll("circle.node")
		.call(force.drag);

	    force.on("tick", function() {
		if (!hull.empty()) {
		    hull.data(convexHulls(net.nodes, off))
			.attr("d", drawCluster);
		}

		link.attr("x1", function(d) { return d.source.x; })
		    .attr("y1", function(d) { return d.source.y; })
		    .attr("x2", function(d) { return d.target.x; })
		    .attr("y2", function(d) { return d.target.y; });

		node.attr("cx", function(d) { return d.x; })
		    .attr("cy", function(d) { return d.y; });
	    });
	}

    });
});
