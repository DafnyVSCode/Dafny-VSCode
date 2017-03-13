$version_url = "https://raw.githubusercontent.com/FunctionalCorrectness/Dafny/master/version.txt"

$dafny_windows_url = "https://raw.githubusercontent.com/FunctionalCorrectness/Dafny/master/windows.txt"

Try 
{
    $response = Invoke-WebRequest -Uri $version_url
    $version = $response.Content

    $response = Invoke-WebRequest -Uri $dafny_windows_url
    $dafny_url = $response.Content


    $appdata = $env:APPDATA
    $outputdir = "$appdata\Dafny\Windows"
    $output = "$outputdir\DafnyWindows.zip"

    if(!(Test-Path -Path $outputdir )){

        New-Item -ItemType Directory -Force -Path $outputdir
        Invoke-WebRequest -Uri $dafny_url -OutFile $output
        Expand-Archive $output -DestinationPath $outputdir 
    }
}
Finally
{
    stop-process -Id $PID
}


