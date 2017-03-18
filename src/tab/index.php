<!DOCTYPE HTML>
<html lang="en-US">
    <head>
        <meta charset="UTF-8">
       <!--  <meta http-equiv="refresh" content="1;url=https://apps.facebook.com/elkoura_andek_delice"> -->

        <title>Elkoura 3andek by Délice</title>
    </head>
    <body>
    
<div id="fb-root"></div>
		<script>
		
		(function(d, s, id) {
		  var js, fjs = d.getElementsByTagName(s)[0];
		  if (d.getElementById(id)) return;
		  js = d.createElement(s); js.id = id;
		  js.src = "//connect.facebook.net/fr_FR/all.js#xfbml=1&appId=638610069655704";
		  fjs.parentNode.insertBefore(js, fjs);
		}(document, 'script', 'facebook-jssdk'));
		
		FB.Canvas.setDoneLoading( function(response) {
		console.log(response.time_delta_ms);
		FB.Canvas.setAutoGrow();
        });
		</script>
		
<?php

$signed_request  = $_REQUEST["signed_request"];
list($encoded_sig, $payload) = explode('.', $signed_request, 2);
$data = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);


	
	  
?>
<script>
	window.top.location = 'https://apps.facebook.com/elkoura_andek_delice' ;
</script>

	

        <!-- Note: don't tell people to `click` the link, just tell them that it is a link. -->
     <!--   If you are not redirected automatically, follow the <a href='https://apps.facebook.com/gamme_ssangyong'>link to Gamme Ssangyong</a>-->
    </body>
</html>


