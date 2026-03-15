; RealSearch Inno Setup Installer
; Tự cài VC++ Redistributable 2015-2022 nếu chưa có

#define MyAppName "Real SEO"
#define MyAppExeName "RealSearch.exe"
#define MyAppPublisher "TechReal"
#define MyAppURL "https://seo.toolsx.vn"

; Version được truyền từ command line: /DMyAppVersion=0.6.4
#ifndef MyAppVersion
  #define MyAppVersion "0.0.0"
#endif

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-RealSearch01}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={userappdata}\RealSearch
DisableProgramGroupPage=yes
DisableDirPage=yes
OutputBaseFilename=RealSearchSetup
SetupIconFile=assets\icon.ico
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\assets\icon.ico
WizardStyle=modern

[Languages]
Name: "vietnamese"; MessagesFile: "compiler:Default.isl"

[Files]
; App chính
Source: "dist\RealSearch.exe"; DestDir: "{app}"; Flags: ignoreversion
; Icon
Source: "assets\icon.ico"; DestDir: "{app}\assets"; Flags: ignoreversion
; VC++ Redistributable (chỉ extract, cài trong [Run])
Source: "redist\vc_redist.x64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall; Check: VCRedistNeedInstall

[Icons]
Name: "{userdesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\assets\icon.ico"
Name: "{userstartmenu}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\assets\icon.ico"

[Run]
; Cài VC++ Redistributable nếu cần (silent, no restart)
Filename: "{tmp}\vc_redist.x64.exe"; Parameters: "/install /quiet /norestart"; StatusMsg: "Đang cài đặt Visual C++ Runtime..."; Flags: waituntilterminated; Check: VCRedistNeedInstall
; Chạy app sau khi cài xong
Filename: "{app}\{#MyAppExeName}"; Description: "Chạy {#MyAppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\logs"
Type: filesandordirs; Name: "{app}\assets"
Type: files; Name: "{app}\credentials.dat"
Type: files; Name: "{app}\config.json"

[Code]
// Kiểm tra VC++ 2015-2022 Redistributable đã cài chưa
// Kiểm tra registry key của VC++ 14.x runtime
function VCRedistNeedInstall: Boolean;
var
  Version: String;
begin
  Result := True; // Mặc định: cần cài

  // Kiểm tra x64 VC++ 2015-2022 (14.x)
  if RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64', 'Version', Version) then
  begin
    // Có cài rồi, kiểm tra version >= 14.29 (VS 2019 16.11+)
    Log('VC++ Runtime found: ' + Version);
    // version format: v14.xx.xxxxx
    if (CompareStr(Version, 'v14.29') >= 0) then
    begin
      Result := False; // Đã có, không cần cài
      Log('VC++ Runtime is up-to-date, skip install');
    end;
  end;

  // Kiểm tra thêm qua Installed Products
  if Result then
  begin
    if RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64', 'Version', Version) then
    begin
      if (CompareStr(Version, 'v14.29') >= 0) then
      begin
        Result := False;
        Log('VC++ Runtime (WOW64) found and up-to-date: ' + Version);
      end;
    end;
  end;

  if Result then
    Log('VC++ Runtime NOT found or outdated, will install');
end;
