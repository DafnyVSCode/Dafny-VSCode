
Try 
{
    
    $appdata = $env:APPDATA
    $outputdir = "$appdata\Dafny\"
    Remove-Item -Recurse -Force $outputdir
}
Finally
{
    stop-process -Id $PID
}


