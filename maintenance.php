<?php

include('connect_db.php');
require 'smarty3/Smarty.class.php';
$smarty = new Smarty;
$selectedstation=0;
$editid=0;
$savetext="Add";
if(array_key_exists('editid',$_GET) &&  $_GET['editid']*1>0){
    $savetext="Save";
    $sql="select * from sensor where id=?";
    $sqlh=$dbh->prepare($sql);
    $sqlh->execute(array($_GET['editid']));
    $data=$sqlh->fetchAll(PDO::FETCH_ASSOC);
//    print_r($data[0]);
    $smarty->assign('editid',$_GET['editid']);
    $smarty->assign('editrow',$data[0]);
    $selectedstation=$data[0]['stationid'];
}else{
    $smarty->assign('editid',0);
}
$smarty->assign('savetext',$savetext);

if(count($_POST)>0){
//Array ( [sensorid] => 3 [sensorSender] => 5 [stationName] => [station] => 5 [sensorFactor] => 1000 [sensorTypeid] => 104 [sensorType] => DHT22 [sensorMin] => 0 [sensorMax] => 100 [sensorMaxDelta] => [sensorName] => [sensorAdress] => ) 
//print_r($_POST);

    if($_POST['stationName']>''){
        $sql="insert into station(id,name) (select max(id)+1,? from station) returning id";
        $sqlh=$dbh->prepare($sql);
        $sqlh->execute(array($_POST['stationName']));
        $data=$sqlh->fetchAll(PDO::FETCH_ASSOC);
        $_POST['station']=$data[0]['id'];
    }
    $valuearray=array($_POST['sensorName'],$_POST['sensorAdress'],$_POST['sensorType'],$_POST['sensorMin'],$_POST['sensorMax'],$_POST['sensorMaxDelta'],$_POST['sensorTypeid']*1,$_POST['station']*1,$_POST['sensorFactor']*1,$_POST['sensorSender']*1);
    //print_r($valuearray);
    foreach($valuearray as &$val){
        $val=$val==""?null:$val;
    }
    //print_r($valuearray);
    if($_POST['sensorid']*1>0){
        $sql="update sensor set name=?,sensoraddr=?,type=?,minvalue=?,maxvalue=?,maxdelta=?,typeid=?,stationid=?,factor=?, senderid=?  where id = ?";
        $valuearray[]=$_POST['sensorid']*1;
    }else{
        $sql="insert into sensor(name,sensoraddr,type,minvalue,maxvalue,maxdelta,typeid,stationid,factor, senderid) values(?,?,?,?,?,?,?,?,?,?)";
    }
    //print_r($sql);
    $sqlh=$dbh->prepare($sql);
    $sqlh->execute($valuearray);
    //print_r("DONE!");
    //$dbh->commit();
        //$data=$sqlh->fetchAll(PDO::FETCH_ASSOC);
}



$sql="select sensor.*,station.name as station from sensor left join station on stationid=station.id order by senderid";
$sqlh=$dbh->prepare($sql);
$sqlh->execute();
$data=$sqlh->fetchAll(PDO::FETCH_ASSOC);
$smarty->assign('data',$data);

//print_r($data);

$sql="select id,name from station";
$sqlh=$dbh->prepare($sql);
$sqlh->execute();
$data=$sqlh->fetchAll(PDO::FETCH_ASSOC);
$stationlist=array();
foreach ($data as $d){
    $stationlist[$d['id']]=$d['name'];
}
$smarty->assign("stationlist",$stationlist);
//$smarty->force_compile = true;
//$smarty->debugging = true;
$smarty->caching = false;
$smarty->cache_lifetime = 120;
//print_r($_GET);
//print_r($_POST);
//$smarty->assign('editid',$editid);
$smarty->assign('selectedstation',$selectedstation);
$smarty->assign('pagetitle','Maintenance');
$smarty->assign('vlevel',voltagelevel());
$smarty->display('maintenance.tpl');
?>
