
Try 
{
    
    $appdata = $env:APPDATA
    $outputdir = "$appdata\Dafny\Windows"
    Remove-Item -Recurse -Force $outputdir
}
Finally
{
    stop-process -Id $PID
}


