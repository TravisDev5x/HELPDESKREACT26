<?php
$ch=curl_init('http://localhost/api/tickets');
curl_setopt($ch,CURLOPT_RETURNTRANSFER,true);
$response=curl_exec($ch);
$code=curl_getinfo($ch,CURLINFO_HTTP_CODE);
var_dump($code);
?>
