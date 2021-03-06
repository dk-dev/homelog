/*

(c) Morten Sickel February 2011 licenced under the GNU GPL 2 or later
*/

window.onload=pageonload;



var url="ajaxserver.php";  // The url of the program that serves the data to be presented
var streams=[];
var splitchar="!"; 
var datasets=[];
var svgwidth;
var svgheight;
var graphheight;
var graphwidth
var svgxoffset;
var svgyoffset;
var lmargin=70;
var rmargin=70;
var bmargin=70;
var spans={}; // range per unit
var timespan=[1E99,0];
var svg;

function pageonload(event){
    Event.observe($('btLoad'),'click',fetchData);
    Event.observe($('btLastWeek'),'click',loadtimespan);
    Event.observe($('btBack'),'click',pagetime);
    Event.observe($('btForward'),'click',pagetime);
    Event.observe($('bt2xBack'),'click',pagetime);
    Event.observe($('bt2xForward'),'click',pagetime);
    Event.observe($('btLastMonth'),'click',loadtimespan);
    Event.observe($('btLastYear'),'click',loadtimespan);
    Event.observe($('btLastDay'),'click',loadtimespan);
    Event.observe($('btClear'),'click',cleargraph);
    var svg=document.getElementById('svg');
    svgwidth=svg.getAttribute("width");
    svgxoffset=lmargin;
    svgheight=svg.getAttribute("height");
    svgyoffset=0;
    var outerbox=document.createElementNS('http://www.w3.org/2000/svg','rect');
    outerbox.setAttribute("x",0);
    outerbox.setAttribute("y",0);
    outerbox.setAttribute("width",svgwidth);
    outerbox.setAttribute("height",svgheight);
    outerbox.setAttribute('style','stroke-width:1;fill:white;stroke:black');
    svg.append(outerbox);
    graphwidth=svgwidth-(lmargin+rmargin);
    graphheight=svgheight-bmargin;
    var outerbox=document.createElementNS('http://www.w3.org/2000/svg','rect');
    outerbox.setAttribute("x",lmargin);
    outerbox.setAttribute("y",0);
    outerbox.setAttribute("width",graphwidth);
    outerbox.setAttribute("height",graphheight);
    outerbox.setAttribute('style','stroke-width:1;fill:white;stroke:black');
    svg.append(outerbox);
    // sets default: Fetches data for the last week
    // TODO: use get-parameters
    if($('from').value==''){
    	settimespan(event);
    }
    fetchData(event);
}


var clearclassnames=[]; // classes to be cleared out when the graph is being reset.

function cleargraph(event){
    var svg=document.getElementById("svg");
    for(var i=0; i< clearclassnames.length; i++){
        var elems = svg.getElementsByClassName(clearclassnames[i]);
        while(elems.length>0){
            svg.removeChild(elems[elems.length-1]);
        }
    }
    spans={};
    timespan=[1E99,0];
}    

function loadtimespan(event){
    settimespan(event);
    for (var i=0; i< streams.length;i++){
        // Adjusting all streams to the same time span
        // TODO: Fix if there are streams starting at different times, 
        // keep start time, adjust timespan
        streams[i].from = $('from').value;
	    streams[i].to =$('to').value;
        streams[i].fetched=false;
    }
    datasets=[];
    fetchData(event);
}

function settimespan(event){
    var date=new Date();
    var ndays=7;
    if (event.target.id=="btLastDay"){
      ndays=1;
    }
    if (event.target.id=="btLastMonth"){
	// Change to go one month back...
	// Subtract on the month value
      ndays=30;
    }
    if(event.target.id==="btLastYear"){
     // correct for leap year...
      ndays=365;
    }
    date.setHours(0,0,0,0); // from midnight
    date.setTime(date.getTime()-ndays*24*3600*1000); // back ndays days
    $('from').value=formattime(date);
    $('to').value='';
}

function stringtodate(string){
    var elems=string.split(/[\s:-]/);
    var strtime = new Date(elems[0],elems[1]-1,elems[2],elems[3],elems[4],elems[5]);
    return(strtime);
}

   
    
function pagetime(event){
    var target=event.element();
    var id=target.id;
    var timespan;
    var totime;
    var fromtime=stringtodate($('from').value);
    if( $('to').value==''){
	totime=new Date();
    }else{
	totime=stringtodate($('to').value);
    }
    timespan=totime.getTime()-fromtime.getTime();
    if (id=="btBack"){
	$('to').value=$('from').value;
	fromtime.setTime(fromtime.getTime()-timespan);
	$('from').value=formattime(fromtime);
    }else if (id=="btForward"){
	if(stringtodate($('to').value).getTime()<Date.now()){
	    $('from').value=$('to').value;
	    totime.setTime(totime.getTime()+timespan);
	    $('to').value=formattime(totime);
	}
	// Should not allow times entirely in the future...
    }else if (id=="bt2xBack"){
        fromtime.setTime(totime.getTime()-2*timespan);
	$('from').value=formattime(fromtime);
    }else if (id=="bt2xForward"){
        if(stringtodate($('to').value).getTime()<Date.now()){
            totime.setTime(fromtime.getTime()+2*timespan);
            $('to').value=formattime(totime);
        }
    }
    fetchData(event);
}



var prevsent; // the dataset id it was asked for last time

function fetchData(event){ // This may be called by a periodical executer
    if (!($('adddata').checked)){
        streams=[];
        datasets=[];
    }
    var sensorid=$('paramchoose0').value;
    var newstream={stream: sensorid
	,from: $('from').value
	,to: $('to').value
    ,fetched: false
    };
    var existing = false;
    for (var i=0; i< streams.length;i++){
        existing = existing || (streams[i].stream==newstream.stream  
            && (streams[i].from == newstream.from
             || streams[i].to ==newstream.to))
             // Do not want the same dataset twice
    }
    if (!existing){
        streams.push(newstream);
    }
    $('spinner').style.visibility="visible";
    document.cookie="sensorid="+sensorid; 
    var sensors=[];
    var tos=[];
    var froms=[];
    var graphids=[];
    for (var i=0; i< streams.length; i++){
        if (!(streams[i].fetched)){
            var s=streams[i];
            sensors.push(s.stream);
            tos.push(s.to);
            froms.push(s.from);
            graphids.push(i);
        }
    }
    param=$H({ // All these values are dependent on the backend server...
        a: 'tempdata'
        ,stream: sensors.join(splitchar)
        ,from: froms.join(splitchar)
        ,to: tos.join(splitchar)
        ,graphids: graphids.join(splitchar)
        ,average: $('average').value
        ,aggtype: $('aggtype').value
        ,splitchar: splitchar
        ,fool_ie: Math.random()
    });
    $('jsondata').href=url+"?"+param.toQueryString();
    // simplest way to stop internet explorer from caching
    ajax=new Ajax.Request(url,
        {method:'get',
        parameters: param.toQueryString(),
        onComplete: hHR_receiveddata}
    );
}

function pad10(input){
    if (input < 10){
        input="0"+input;
    }
    return input;
}


function formattime(date){
    return(''+(date.getYear()+1900)+'-'+(date.getMonth()+1)+'-'+date.getDate()+' 00:00:00');
}


function convertdate(tzdate,defaultval){
    var date= new Date(tzdate);
    if(date.getYear()>100){
        var hours=pad10(date.getHours());
        var minutes=pad10(date.getMinutes());
        var seconds=pad10(date.getSeconds());
        retvalue=''+(date.getYear()+1900)+'-'+(date.getMonth()+1)+'-'+date.getDate()+' '+hours+':'+minutes+':'+seconds;    
    }else{
        retvalue=defaultval;
    }
    return(retvalue);
}

var units=[];

function hHR_receiveddata(response,json){ // The response function to the ajax call
    cleargraph(null);
    if(Object.inspect(json)){
        var jsondata=response.responseText.evalJSON();
        if(jsondata.error>''){
            $('error').innerHTML=jsondata.error;
        }
        if (!($('adddata').checked)){
            $('from').value=convertdate(jsondata.starttime,$('from').value);
            $('to').value=convertdate(jsondata.stoptime,$('to').value);
        }
        var dataset=$A(jsondata.datapoints);
        if(dataset[0].size()>1){
            $('log').innerHTML=dataset[0].size()+" datapoints";
        }
        for (var i=0;i<dataset.length;i++){
            streams[i].fetched=true;
            var set={};
            var d=dataset[i];
            var time=[];
            var value=[];
            set['min']=Number.POSITIVE_INFINITY;
            set['first']=Number.POSITIVE_INFINITY;
            set['max']=Number.NEGATIVE_INFINITY;
            set['last']=Number.NEGATIVE_INFINITY;
            for (var e of d){
                time.push(e[0]);
                value.push(e[1]);
                set['min']=Math.min(set['min'],e[1]);
                set['max']=Math.max(set['max'],e[1]);
                set['first']=Math.min(set['first'],e[0]);
                set['last']=Math.max(set['last'],e[0]);
            }
            set['time']=time;
            set['value']=value;
            set['unit']=jsondata.unit[i];
            set['station']=jsondata.station[i];
            // Do not want to push the same dataset twice:
            var dopush=true;
            for (var ds of datasets){
                var equals=true;
                var checkfiels=['station','unit','first','last'];
                for (var cf of checkfiels){
                    equals=equals && set[cf]==ds[cf];
                }
                dopush=dopush && ! equals;
            }
            if (dopush){
                datasets.push(set);
            }
        }
        drawgraphs();
    }
}

    
function drawgraphs(){
    var nsets=datasets.length;
    for(var i=0;i<nsets; i++){
        var u=datasets[i].unit;
        try{
            spans[u]=[Math.min(spans[u][0],datasets[i]['min']),Math.max(spans[u][1],datasets[i]['max'])];
        }catch(e){
            // To catch the first attempt
            spans[u]=[datasets[i]['min'],datasets[i]['max']];
        }
        timespan=[Math.min(timespan[0],datasets[i]['first']),Math.max(timespan[1],datasets[i]['last'])];
    }
    var xfact=graphwidth/(timespan[1]-timespan[0]);
    var svg=document.getElementById("svg");
    //
    //    To create the graph lines
    //
    var nlegs=4;
    var legwidth=200;
    var legheight=15
    for (var i=0;i< datasets.length; i++){
        var sp=spans[datasets[i]['unit']];
        var yfact=graphheight/(sp[1]-sp[0]);
        var coords=[];
        for (var j=0; j<datasets[i]['value'].length; j++){
            var x=Math.floor(svgxoffset+(datasets[i]['time'][j]-timespan[0])*xfact);
            var y=Math.floor(svgyoffset+(datasets[i]['value'][j]-sp[0])*yfact); 
            y=graphheight-y;// origin in upper left corner
            var coord=x.toString()+","+y.toString();
            coords.push(coord);
        }
        var polyline = document.createElementNS('http://www.w3.org/2000/svg','polyline');
        polyline.setAttribute("points",coords.join(" "));
        var color=linecolors[i];
        polyline.setAttribute('style','stroke-width:1;fill:none;stroke:'+color);
        polyline.setAttribute("class","graphline");
        svg.append(polyline);
        var legx=i%nlegs;
        var legy=Math.floor(i/nlegs);
        legx=legx*legwidth+10;
        legy=legy*15+25+graphheight;
        var legtext=datasets[i]['station']+" ("+datasets[i]['unit']+")";
        svg.append(createline(legx,legx+50,legy,legy,color,"legendline",1));
        var legelem=createtext(legtext,legx+55,legy+5,"left","legendtext");
        legelem.style = "cursor: pointer;";
        legelem.id="legtext_"+i;
        legelem.onclick=removegraph;
        svg.append(legelem);
    }
    clearclassnames.push("legendline");
    clearclassnames.push("legendtext");
    clearclassnames.push("graphline");
    
    //
    //    To create the labels on the x-axis:
    //
    var days=((timespan[1]-timespan[0])/(24*3600)).round()
    // This will not work properly on plots of less than one day
    var vlinedist=1;
    if( days > 20 ){
        vlinedist = Math.ceil(vlinedist*days/10)
    }
    vlinedist*=24*3600;
    if (days < 3){
        vlinedist=6*3600;
    }
    var xtime=Math.ceil(timespan[0]/vlinedist)*vlinedist;
    var x=svgxoffset+(xtime-timespan[0])*xfact;
    while(xtime < timespan[1]){
        svg.append(createline(x,x,svgyoffset,graphheight,"blue","axisline"));
        var timetext=""
        if (xtime%(24*3600)==0){ 
            timetext=formatdate(new Date(xtime*1000),false);
        }
        // else - time of day
        svg.append(createtext(timetext,x,graphheight+15,"middle","axistext"));
        xtime+=vlinedist;
        x=x+vlinedist*xfact;
    }
    clearclassnames.push("axistext");
        
    //
    //     To create the labels along the y-axis:
    //
    var n=0;
    var firstdataset=true;
    for (var key in spans){
        // Go through the relevant units. 
        //
        var sp=spans[key]
        var yfact=graphheight/(sp[1]-sp[0]);
        var x;
        // x: Where to put the label - each second on left and right side
        if (n%2==0){
            x=5;
        }else{
            x=svgwidth-rmargin+5;
        }
        var yoffset=5+Math.floor(n/2)*13;
        // The last part to offset labels vertically if there are more labels on one axis
        var nlines=6;
        var span=sp[1]-sp[0];
        var oomspan=Math.floor(Math.log(span)/Math.log(10))-1;
        var roundfact=Math.pow(10,oomspan);
        var hlinedist=span/nlines;
        // Want the first line half the line distance down from the top:
        var yval=sp[1]-hlinedist/2;
        var y=svgyoffset+(yval-sp[0])*yfact+7;
        y=graphheight-y;
        var firstline = true;
        while(y<graphheight){
            if(firstdataset){ 
            // Do not want to redraw lines. They are supposed to end up the same place,
            // But may be bitten by rounding errors
                svg.append(createline(svgxoffset,svgwidth-rmargin,y,y,"blue","axisline"));
            }
            var label=Math.floor(yval/roundfact)*roundfact;
            if(oomspan < 0){
                // Need this to clean up decimals if there should be any: 
                label=label.toFixed(-1*oomspan);
            }
            if (firstline){
                label=""+label+" ("+key+")";
                firstline=false;
            }
            if (roundfact<0){
                Math.round(label,-roundfact);
            }
            svg.append(createtext(label,x,y+yoffset,"left","axistext"));
            yval-=hlinedist;
            y+=hlinedist*yfact;
        }
        n=n+1;
        firstdataset=false;
    }
    clearclassnames.push("axisline");
    clearclassnames.push("axistext");
    
    $('spinner').style.visibility="hidden";
}

function formatdate(d,year){
    var datestring;
    if (year){
        datestring=''+(d.getYear()+1900)+"-"+d.getDate()+'/'+(d.getMonth()+1);
    }else{
        datestring=''+d.getDate()+'/'+(d.getMonth()+1);
    }
    return(datestring);
}

function createtext(text,x,y,align,classname){
    var textnode=document.createElementNS("http://www.w3.org/2000/svg",'text');
    textnode.appendChild(document.createTextNode(text));
    textnode.setAttribute("text-anchor",align);
    textnode.setAttribute("x",x);
    textnode.setAttribute("y",y);
    textnode.setAttribute("font-size",12);
    textnode.setAttribute("class",classname);
    return(textnode);
}

function removegraph(event){
    var target=event.element();
    var id=target.id;
    var elems=id.split("_");
    var removeid=parseInt(elems[1]);
    if(confirm("Delete graph?")){
        datasets.splice(removeid,1);
        streams.splice(removeid,1);
        cleargraph();
        drawgraphs();
    }
    
}

function createline(x1,x2,y1,y2,color,classname,strokewidth){
    color=typeof color !== 'undefined' ? color : 'blue';
    classname=typeof classname !== 'undefined' ? classname: 'noclass';
    strokewidth=typeof strokewidth !== 'undefined' ? strokewidth : 0.1;
    line=document.createElementNS("http://www.w3.org/2000/svg",'line');
    line.setAttribute('x1',x1);
    line.setAttribute('x2',x2);
    line.setAttribute('y1',y1);
    line.setAttribute('y2',y2);
    line.setAttribute('class','ROIline');
    line.setAttribute('stroke',color);
    line.setAttribute('stroke-width',strokewidth);
    line.setAttribute('class',classname);
    return line;
}  


var linecolors=['blue','green','red','gray','yellow','orange','black']

