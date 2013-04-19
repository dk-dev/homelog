<?php

$dbtype='pgsql';
include('dbconn.php');
// sets the values username, server, database and password

$unit="&deg;C";
try{
    $connectstring=$dbtype.':host='.$server.';dbname='.$database;
    $dbh = new PDO($connectstring, $username, $password);
    if($dbtype=='pgsql'){
      $dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

  }
  catch(PDOException $e){
    $message=$e->getMessage(); 
// TODO add on a header to signal error
    exit( "<p>Cannot connect - $message</p>");
  }

#  $sql='select temp as "value",to_char(datetime at time zone \'UTC\' ,\'yyyy-mm-dd"T"HH24:MI:SS"Z"\') as "at" from temp_stream where name=? and datetime>?';
 $sql='select value, to_char(datetime at time zone \'UTC\' ,\'yyyy-mm-dd"T"HH24:MI:SS"Z"\') as "at" from measure_qa where sensorid=? and datetime>?';
$params=array($_GET['from']);
if($_GET['stream']=='Inne'){
   array_unshift($params,2);
}elseif($_GET['stream']=='Ute'){
   array_unshift($params,1);
}
if($_GET['stream']=='Inne-Ute'){
  $sql="select value,at from tempdiff where datetime >?";
 }elseif($_GET['stream']=='Trykk'){
  $sql='select value/100 as "value", to_char(datetime at time zone \'UTC\' ,\'yyyy-mm-dd"T"HH24:MI:SS"Z"\') as "at" from measure_qa where sensorid=4 and datetime>?';
//  TODO fetch units from database
  $unit='hPa';
}elseif($_GET['stream']=='Trykk - 0m'){
  $sql='select value/100+12*0.45 as "value", to_char(datetime at time zone \'UTC\' ,\'yyyy-mm-dd"T"HH24:MI:SS"Z"\') as "at" from measure_qa where sensorid=4 and datetime>?';
  $unit='hPa';
}elseif($_GET['stream']=='Fuktighet'){
  $sql='select value as "value", to_char(datetime at time zone \'UTC\' ,\'yyyy-mm-dd"T"HH24:MI:SS"Z"\') as "at" from measure_qa where sensorid=5 and datetime>?';
  $unit="%";
}elseif($_GET['stream']=='Fuktighet DHT22'){
  $sql='select value as "value", to_char(datetime at time zone \'UTC\' ,\'yyyy-mm-dd"T"HH24:MI:SS"Z"\') as "at" from measure_qa where sensorid=9 and datetime>?';
  $unit="%";
}elseif($_GET['stream']=='Temp DHT22'){
  $sql='select value as "value", to_char(datetime at time zone \'UTC\' ,\'yyyy-mm-dd"T"HH24:MI:SS"Z"\') as "at" from measure_qa where sensorid=8 and datetime>?';
  $unit="&degC";
}elseif($_GET['stream']=='Temp DHT11'){
  $sql='select value as "value", to_char(datetime at time zone \'UTC\' ,\'yyyy-mm-dd"T"HH24:MI:SS"Z"\') as "at" from measure_qa where sensorid=6 and datetime>?';
  $unit="&degC";
}elseif($_GET['stream']=='Temp BHP085'){
  $sql='select value as "value", to_char(datetime at time zone \'UTC\' ,\'yyyy-mm-dd"T"HH24:MI:SS"Z"\') as "at" from measure_qa where sensorid=3 and datetime>?';
  $unit="&degC";
}elseif($_GET['stream']=='Forbruk'){
  $sql='select round(100*kwh/hours)/100 as "value", to_char(datetime at time zone \'UTC\' ,\'yyyy-mm-dd"T"HH24:MI:SS"Z"\') as "at" from powerdraw where datetime >?';	
  $unit='kW';
}#else{
 # array_unshift($params,$_GET['stream']);
#}
if($_GET['to']*1>1){
	$params[]=$_GET['to'];
	$sql.=' and datetime < ?';
}
$sql.=' order by datetime';
// print($sql);
$sqh=$dbh->prepare($sql);
# print_r($params);	
$sqh->execute($params);
$data=$sqh->fetchAll(PDO::FETCH_ASSOC);

if($_GET['type']=='svg'){
// for future use
}else{
// return json
   if($_GET['DEBUG']){
	$data['debug']['sql']=$sql;
	$data['debug']['name']=$_GET['stream'];
	$data['debug']['from']=$_GET['from'];
	$data['params']=$params;
}	
	print('{
  	"datapoints":');
	print(json_encode($data));
	print(",\"unit\":\"$unit\"}");
}
?>
