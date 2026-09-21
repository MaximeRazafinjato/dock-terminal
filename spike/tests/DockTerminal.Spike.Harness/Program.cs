using System.Text;
using DockTerminal.Spike.Core.Native;
using DockTerminal.Spike.Harness;

Console.OutputEncoding = Encoding.UTF8;
var providers = new List<PseudoConsoleProvider> { PseudoConsoleProvider.Windows };
if (PseudoConsoleApi.IsEmbeddedAvailable())
{
    providers.Add(PseudoConsoleProvider.Embedded);
}
else
{
    Console.WriteLine("conpty.dll absente : comparaison avec OpenConsole ignorée.");
}

var allPassed = true;
foreach (var provider in providers)
{
    Console.WriteLine();
    Console.WriteLine($"## ConPTY {(provider == PseudoConsoleProvider.Windows ? "intégrée à Windows " + Environment.OSVersion.Version : "embarquée (conpty.dll OpenConsole " + System.Diagnostics.FileVersionInfo.GetVersionInfo(Path.Combine(AppContext.BaseDirectory, "OpenConsole.exe")).FileVersion + ")")}");
    Console.WriteLine();
    Console.WriteLine("| Scénario | Résultat | Détail |");
    Console.WriteLine("| --- | --- | --- |");
    var results = await new ScenarioRunner(provider).RunAsync();
    foreach (var result in results)
    {
        allPassed &= result.Passed;
        Console.WriteLine($"| {result.Name} | {(result.Passed ? "OK" : "ÉCHEC")} | {result.Detail.Replace("|", "\\|")} |");
    }
}

Console.WriteLine();
Console.WriteLine(allPassed ? "Tous les scénarios sont passés." : "Au moins un scénario a échoué.");
return allPassed ? 0 : 1;
