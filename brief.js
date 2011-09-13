
var w = 960,
    h = 500,
    fill = d3.scale.category20(),
    nodes = [],
    links = [];

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", w)
    .attr("height", h);

vis.append("svg:rect")
    .attr("width", w)
    .attr("height", h);

var force = d3.layout.force()
    .distance(30)
    .nodes(nodes)
    .links(links)
    .size([w, h]);
    


/*
var cursor = vis.append("svg:circle")
    .attr("r", 30)
    .attr("transform", "translate(-100,-100)")
    .attr("class", "cursor");
*/

force.on("tick", function() {
  vis.selectAll("line.link")
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  vis.selectAll("circle.node")
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
});

/*
vis.on("mousemove", function() {
  cursor.attr("transform", "translate(" + d3.svg.mouse(this) + ")");
});
*/

vis.on("click", function() {
  var point = d3.svg.mouse(this),
      node = {x: point[0], y: point[1]},
      n = nodes.push(node);

  restart();
});

restart();

var selected = false;

function linked(s, t)
{
	return links.some(function(l) { return (l.source == s && l.target == t)
													|| (l.source == t && l.target == s); });  
}

function addLink(s, t)
{
	if(!linked(s, t)
	{
		links.push({source: s, target: t});
		return true;
	}
	return false;
}

function restart() {
  force.start();

  vis.selectAll("line.link")
      .data(links)
    .enter().insert("svg:line", "circle.node")
      .attr("class", "link")
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  vis.selectAll("circle.node")
      .data(nodes)
    .enter().insert("svg:circle", "circle.cursor")
      .attr("class", "node")
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .attr("r", 10)
      .on("click", function(d) {
        d3.event.cancelBubble = true;
        if(selected)
        {
        	 addLink(selected, d);
        	 selected = false;
        }
        else
        {
        	selected = d;
        }
        restart();
      })
      .call(force.drag);
    
    
}
