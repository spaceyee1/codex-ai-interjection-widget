using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

internal static class Installer {
    static readonly UTF8Encoding Utf8=new UTF8Encoding(false);
    [STAThread] static int Main(string[] args){
        try{
            if(args.Length==2&&args[0]=="--extract-only"){Extract(args[1]);return 0;}
            if(args.Length==4&&args[0]=="--install-test"){
                if(!args[3].StartsWith("Codex Whale Package Test ",StringComparison.Ordinal))throw new Exception("测试任务名无效。");
                Extract(args[1]);Setup(args[1],args[2],args[3],true);return 0;
            }
            if(args.Length!=0)throw new Exception("参数无效。");
            Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new MainForm());return 0;
        }catch(Exception e){if(args.Length==0)MessageBox.Show(e.Message,"Codex 小鲸鱼",MessageBoxButtons.OK,MessageBoxIcon.Error);else Console.Error.WriteLine(e.Message);return 1;}
    }
    static string Full(string s){if(String.IsNullOrWhiteSpace(s)||!Path.IsPathRooted(s))throw new Exception("路径必须是完整文件夹路径。");return Path.GetFullPath(s).TrimEnd(Path.DirectorySeparatorChar);}
    static void NoLinks(string s){for(string p=Path.GetFullPath(s);!String.IsNullOrEmpty(p);p=Path.GetDirectoryName(p))if((Directory.Exists(p)||File.Exists(p))&&(File.GetAttributes(p)&FileAttributes.ReparsePoint)!=0)throw new Exception("安装目录包含链接，请选择实际目录。");}
    static string Hash(Stream s){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(s)).Replace("-","").ToLowerInvariant();}
    static bool EqualFile(string file,ZipArchiveEntry entry){using(var a=File.OpenRead(file))using(var b=entry.Open())return a.Length==entry.Length&&Hash(a)==Hash(b);}
    public static void Extract(string folder){
        string root=Full(folder);NoLinks(root);
        if(File.Exists(root)||(Directory.Exists(root)&&Directory.GetFileSystemEntries(root).Length!=0))throw new Exception("解压目标必须为空文件夹。");
        using(var source=Assembly.GetExecutingAssembly().GetManifestResourceStream("Whale.Payload.zip")){
            if(source==null||Hash(source)!=BuildInfo.PayloadHash)throw new Exception("安装包校验失败，请重新获取安装包。");source.Position=0;
            using(var zip=new ZipArchive(source,ZipArchiveMode.Read)){
                var seen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);long total=0;
                if(zip.Entries.Count>3000)throw new Exception("文件数量异常。");
                foreach(var e in zip.Entries){
                    var relative=e.FullName.Replace('/',Path.DirectorySeparatorChar);
                    if(Path.IsPathRooted(relative)||relative.Contains(":"))throw new Exception("安装包路径无效。");
                    foreach(var part in relative.Split(Path.DirectorySeparatorChar))if(part=="."||part==".."||part.Length==0||part.EndsWith(" ")||part.EndsWith("."))throw new Exception("安装包路径无效。");
                    var target=Path.GetFullPath(Path.Combine(root,relative));
                    if(!target.StartsWith(root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase)||!seen.Add(target))throw new Exception("安装包路径越界或重复。");
                    total+=e.Length;if(total>1024L*1024*1024)throw new Exception("安装包大小异常。");
                }
                Directory.CreateDirectory(root);
                foreach(var e in zip.Entries){var target=Path.Combine(root,e.FullName.Replace('/',Path.DirectorySeparatorChar));Directory.CreateDirectory(Path.GetDirectoryName(target));using(var input=e.Open())using(var output=new FileStream(target,FileMode.CreateNew,FileAccess.Write,FileShare.None))input.CopyTo(output);}
                foreach(var e in zip.Entries)if(!EqualFile(Path.Combine(root,e.FullName.Replace('/',Path.DirectorySeparatorChar)),e))throw new Exception("解压文件校验失败。");
            }
        }
    }
    static string Quote(string s){if(s.IndexOf('"')>=0)throw new Exception("路径含无效字符。");return "\""+s.TrimEnd('\\')+"\"";}
    static void Setup(string root,string data,string task,bool test){
        string ps=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows),"System32","WindowsPowerShell","v1.0","powershell.exe");
        string arguments="-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "+Quote(Path.Combine(root,"setup.ps1"));
        if(data!=null)arguments+=" -DataDir "+Quote(Full(data));
        if(task!=null)arguments+=" -TaskName "+Quote(task);
        if(test)arguments+=" -NoStart -NoStartup";
        var info=new ProcessStartInfo(ps,arguments){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,RedirectStandardOutput=true,RedirectStandardError=true};
        using(var process=Process.Start(info)){
            var output=process.StandardOutput.ReadToEndAsync();var errors=process.StandardError.ReadToEndAsync();
            if(!process.WaitForExit(120000))throw new Exception("安装仍未结束，请检查任务计划程序；不要重复安装。");
            var stdout=output.Result;var stderr=errors.Result;
            File.WriteAllText(Path.Combine(root,"install.log"),stdout+Environment.NewLine+stderr,Utf8);
            if(process.ExitCode!=0)throw new Exception("自动跟随安装失败。详情保存在："+Path.Combine(root,"install.log")+Environment.NewLine+stderr);
        }
    }
    static string InstallDefault(){
        if(!Environment.Is64BitOperatingSystem)throw new Exception("此安装包需要 64 位 Windows 10/11。");
        string home=Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        string target=Path.Combine(home,"plugins","codex-whale-membership","releases",BuildInfo.Version+"-"+DateTime.Now.ToString("yyyyMMdd-HHmmss"));
        Extract(target);Setup(target,null,null,false);return target;
    }
    sealed class MainForm:Form{
        readonly Label status=new Label();readonly Button install=new Button();readonly Button extract=new Button();
        public MainForm(){
            Text="Codex 小鲸鱼 · 会员额度与 AI 插话";ClientSize=new Size(620,350);FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;StartPosition=FormStartPosition.CenterScreen;Font=new Font("Microsoft YaHei UI",9F);AutoScaleMode=AutoScaleMode.Dpi;
            Controls.Add(new Label{Text="Codex 会员与额度小鲸鱼",Location=new Point(26,23),AutoSize=true,Font=new Font(Font.FontFamily,20F,FontStyle.Bold)});
            Controls.Add(new Label{Text="完整插件、图片、音效和运行组件已内置。\n无需原版插件、GitHub、Node.js 或 npm。",Location=new Point(28,81),Size=new Size(555,52)});
            Controls.Add(new Label{Text="适用于 Windows 10/11 x64，需要已安装 Codex 桌面应用。\n安装后随 Codex 窗口出现；在菜单查看会员与额度。\nAI 插话需要自己的 DeepSeek API Key 和网络，截图会发往 DeepSeek。",Location=new Point(28,144),Size=new Size(555,80)});
            status.SetBounds(28,230,555,46);status.Text="仅安装程序文件，保留已有设置和素材。安装包不含个人密钥与聊天记录。";Controls.Add(status);
            extract.Text="仅解压完整文件";extract.SetBounds(28,292,160,34);Controls.Add(extract);
            extract.Click+=delegate{using(var picker=new FolderBrowserDialog()){if(picker.ShowDialog(this)!=DialogResult.OK)return;Run(()=>{string folder=Path.Combine(picker.SelectedPath,"CodexWhale-"+DateTime.Now.ToString("yyyyMMdd-HHmmss"));Extract(folder);return "完整文件已解压："+folder;});}};
            var guide=new Button{Text="用户使用方式",Location=new Point(204,292),Size=new Size(160,34)};Controls.Add(guide);guide.Click+=delegate{using(var view=new Form()){view.Text="用户使用方式";view.Size=new Size(760,680);view.StartPosition=FormStartPosition.CenterParent;using(var source=Assembly.GetExecutingAssembly().GetManifestResourceStream("Whale.UserGuide.md"))using(var reader=new StreamReader(source,Encoding.UTF8)){view.Controls.Add(new TextBox{Dock=DockStyle.Fill,Multiline=true,ReadOnly=true,ScrollBars=ScrollBars.Vertical,WordWrap=true,Text=reader.ReadToEnd(),Font=new Font("Microsoft YaHei UI",10F)});}view.ShowDialog(this);}};
            install.Text="安装并启用";install.SetBounds(429,292,160,34);Controls.Add(install);
            install.Click+=delegate{Run(()=>{string target=InstallDefault();return "安装完成。打开 Codex 后即可看到小鲸鱼。\n文件位置："+target;});};
        }
        void Run(Func<string> action){install.Enabled=false;extract.Enabled=false;status.Text="正在解压、校验和安装，请稍候……";Task.Factory.StartNew(()=>{string message;bool ok=true;try{message=action();}catch(Exception e){message=e.Message;ok=false;}if(IsDisposed)return;BeginInvoke((Action)(()=>{status.Text=message;install.Enabled=true;extract.Enabled=true;MessageBox.Show(this,message,Text,MessageBoxButtons.OK,ok?MessageBoxIcon.Information:MessageBoxIcon.Error);}));});}
    }
}
