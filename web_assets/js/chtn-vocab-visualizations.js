function degrees(radians) {
  return radians / Math.PI * 180 - 90;
}

window.CHTN ? window.CHTN.vis = {} : window.CHTN = { vis: {} };

var vis = CHTN.vis

d3.json("CHTN Vocab-Disease List.jsonld", function (graph) {

    // Overall Settings

    var scalingFactor = 2.25

    var width = 960*scalingFactor,
        height = 850*scalingFactor,
        chartSelector = "#chart",
        infoSelector = "#info";

    var entities = graph["@graph"], 
        entitiesById = {},
        links = [];

    // Boosting
    window.links = links;

    // Filter out the Subsites
    entities = entities.filter(function (d) {
        return d["@type"] !== "Subsite" && d["@type"] !== "CombinedDiagnosis" && d["@type"] !== "DiagnosisModifier";
    });

    // Construct an index by Entity Id
    entities.forEach(function (d) {
        d.connectors = [];
        entitiesById[d["@id"]] = d;
    });

    // Convert the compatability relationships into links with sources and targets
    entities.forEach(function (source) {
        var processCompatibility = function (source, target) {
            if (!target) return; //skip missing targets, e.g. subsites.
            if (!source.source) source.connectors.push(source.source = {node: source, degree: 0});
            if (!target.target) target.connectors.push(target.target = {node: target, degree: 0});
            links.push({source: source.source, target: target.target});
        }
        if (source.compatible.forEach) {
            // If there are many compatibility statements, they are in an array.
            source.compatible.forEach(function (targetObject) {
                var target = entitiesById[targetObject["@id"]];
                processCompatibility(source, target);
            });
        } else {
            // If there is just one compatibility statement, it's an object
            var target = entitiesById[source.compatible["@id"]];
            processCompatibility(source, target);
        }
    });

    vis.hive = function hive() {

        var innerRadius = 40,
            outerRadius = 640,
            adjustmentAngle = -1 * Math.PI / 6,
            majorAngle = 2 * Math.PI / 3, // 1/3 of a circle
            minorAngle = 1 * Math.PI / 12;

        var angle = d3.scale.ordinal()
            .domain(["Site", "Diagnosis", "Category"])
            .range([
                adjustmentAngle,
                majorAngle + adjustmentAngle,
                2 * majorAngle + adjustmentAngle
            ]);

        var radius = d3.scale.linear()
            .range([innerRadius, outerRadius]);

        var color = d3.scale.category10();

        var formatNumber = d3.format(",d");

        // Initialize the info display
        var info = d3.select("#info")
            .text(defaultInfo = "Showing " + formatNumber(links.length) + " dependencies among " + formatNumber(entities.length) + " entities.")

        var svg = d3.select(chartSelector).append("svg")
                .attr("width", width)
                .attr("height", height)
            .append("g")
              .attr("transform", "translate(" + 640 * .20 + "," + 640 * .57 + ")");

        // Entities by type
        var entitiesByType = d3.nest()
            .key(function (d) { return d["@type"]; })
            .sortKeys(d3.ascending)
            .entries(entities);
        entitiesByType = entitiesByType.slice(0,3);

        // Compute the rank for each type.
        entitiesByType.forEach(function (type) {
            var count = 0;
            type.values.forEach(function (d,i) {
                d.index = count++;
            });
        });

        // Set the radius domain.
        radius.domain(d3.extent(entities, function(d) { return d.index; }));

        // Draw the axes.
        svg.selectAll(".axis")
                .data(entitiesByType)
            .enter().append("line")
                .attr("class", "axis")
                .attr("transform", function(d) { return "rotate(" + degrees(angle(d.key)) + ")"; })
                .attr("x1", radius(-2))
                .attr("x2", function(d) { return radius(d.values.length + 2); });

        // Draw the links.
        svg.selectAll(".link")
                .data(links)
            .enter().append("path")
                .attr("class", "link")
                .attr("d", d3.hive.link()
                    .angle(function (d){
                        return angle(d.node["@type"]);
                    })
                    .radius(function (d){
                        return radius(d.node.index);
                    })
                );

        // Draw the nodes.
        svg.selectAll(".node")
                .data(entities)
            .enter().append("circle")
                .attr("class", "node")
                .attr("transform", function (d) { return "rotate("+degrees(angle(d["@type"]))+")"})
                .attr("cx", function (d) { return radius(d.index); })
                .attr("r", 4)
                .style("fill", function (d) { return color(d["@type"]); })
    };

    vis.hive2 = function hive2() {

        var innerRadius = 40,
            outerRadius = 640*3,
            adjustmentAngle = 0, //-1 * Math.PI / 6,
            majorAngle = 2 * Math.PI / 3, // 1/3 of a circle
            minorAngle = 1 * Math.PI / 12;

        var angle = d3.scale.ordinal()
            .domain(["Site", "Diagnosis", "Category"])
            .range([
                adjustmentAngle,
                majorAngle + adjustmentAngle,
                2 * majorAngle + adjustmentAngle
            ]);

        var angle2 = function (d) {
            var type = d["@type"], d_angle = angle(type);
            if (type === "Site" || type === "Category") {
                return d_angle;
            } else {
                return d.index % 2 ? d_angle + minorAngle : d_angle - minorAngle;
            }
        };

        var translateDiagnoses = function (d) {
            var type = d["@type"], cy;
            if (type === "Diagnosis") {
                cy = d.index % 2 ? 2 : -2;
                return "translate(0,"+cy+") ";
            } else {
                return "";
            }
        }

        var radius = d3.scale.linear()
            .range([innerRadius, outerRadius]);

        var color = d3.scale.category10();

        var formatNumber = d3.format(",d");

        // Initialize the info display
        var info = d3.select("#info")
            .text(defaultInfo = "Showing " + formatNumber(links.length) + " dependencies among " + formatNumber(entities.length) + " entities.")

        var svg = d3.select(chartSelector).append("svg")
                .attr("width", width)
                .attr("height", height)
            .append("g")
              .attr("transform", "translate(" + 200 + "," + 640 + ")"); //TODO Make Dynamic (e.g. "translate(" + outerRadius * .20 + "," + outerRadius * .50 + ")") 

        // Entities by type
        var entitiesByType = d3.nest()
            .key(function (d) { return d["@type"]; })
            .sortKeys(d3.ascending)
            .entries(entities);
        entitiesByType = entitiesByType.slice(0,3);

        // Compute the rank for each type.
        entitiesByType.forEach(function (type) {
            var count = 0;
            type.values.forEach(function (d,i) {
                d.index = count++;
            });
        });

        // Set the radius domain.
        radius.domain(d3.extent(entities, function(d) { return d.index; }));

        // Draw the axes.
        svg.selectAll(".axis")
                .data(entitiesByType)
            .enter().append("line")
                .attr("class", "axis")
                .attr("transform", function(d) { return "rotate(" + degrees(angle(d.key)) + ")"; })
                .attr("x1", radius(-2))
                .attr("x2", function(d) { return radius(d.values.length + 2); });

        // Draw the links.
        svg.selectAll(".link")
                .data(links)
            .enter().append("path")
                .attr("class", "link")
                .attr("d", d3.hive.link()
                    .angle(function (d){
                        return angle(d.node["@type"]);
                    })
                    .radius(function (d){
                        return radius(d.node.index);
                    })
                );

        // Draw the nodes.
        svg.selectAll(".node")
                .data(entities)
            .enter().append("circle")
                .attr("class", "node")
                .attr("transform", function (d) { return translateDiagnoses(d) + "rotate("+degrees(angle(d["@type"]))+")"})
                .attr("cx", function (d) { return radius(d.index); })
                .attr("r", 4)
                .style("fill", function (d) { return color(d["@type"]); })
    };

    vis.bundle = function bundle() {
        var rx = width / 2,
            ry = height / 2,
            m0,
            rotate = 0,
            splines = [];

        var bundle = d3.layout.bundle();

        var cluster = d3.layout.cluster()
            .size([360, ry - 120])
            .sort(function (a, b) { return d3.ascending(a["@id"], b["@id"]); });

        var bundle = d3.layout.bundle();

        var line = d3.svg.line.radial()
            .interpolate("bundle")
            .tension(0.85)
            .radius(function (d) { return d.y; })
            .angle(function (d) { return d.x / 180 * Math.PI; });

        var svg = d3.select(chartSelector).append("svg")
                .attr("width", width)
                .attr("height", height)
            .append("g")
              .attr("transform", "translate(" + rx + "," + ry + ")");
    }

    vis.clusters = function clusters() {
        var foci = {
            "Site": { x: width/2, y: height/4},
            "Category": { x: width/4, y: 3*height/4},
            "Diagnosis": { x: 3*width/4, y: 3*height/4},
            }, fociNames = Object.getOwnPropertyNames(foci);

        var r = 4
            kx = 10,
            ky = d3.scale.ordinal().domain(fociNames).range([25,45,65]);

        var color = d3.scale.category10();

        var force = d3.layout.force()
            .nodes(entities)
            .size([width, height])
            .charge(-10)
            .on("tick", tick)
            .start();

        var svg = d3.select(chartSelector).append("svg")
                .attr("width", width)
                .attr("height", height);

        var node = svg.selectAll("circle")
                .data(entities)
            .enter().append("circle")
                .attr("class", "node")
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; })
                .attr("r", r)
                .style("fill", function(d) { return color(d["@type"]); })
                .style("stroke", function(d) { return d3.rgb(color(d["@type"])).darker(2); })
                .call(force.drag);

        function tick(e) {
            var k = .1 * e.alpha;

            // Push entities toward their designated focus.
            entities.forEach(function(o, i) {
                o.y += (foci[o["@type"]].y - o.y) * k;
                o.x += (foci[o["@type"]].x - o.x) * k;
            });

            node.attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
        }

        setTimeout(force.stop, 5000);

        var keys = svg.selectAll("g.key")
                .data(fociNames)
            .enter().append("g")
                .attr("transform", function (d) { return "translate(" + kx + "," + ky(d) + ")"; })
                .attr("class", "key")
        
        keys.append("circle")
            .attr("r", r)
            .style("fill", function(d) { return color(d); })
            .style("stroke", function(d) { return d3.rgb(color(d)).darker(2); })

        keys.append("text")
            .attr("dx", 10)
            .attr("dy", 5)
            .text(function (d) { return d;})
    }

    vis.clear = function clear() {
        document.querySelector(chartSelector).innerHTML = "";
        document.querySelector(infoSelector).innerHTML = "";
    }

});