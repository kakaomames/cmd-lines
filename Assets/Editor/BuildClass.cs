using UnityEditor;
using UnityEngine;

public class BuildScript
{
    public static void BuildWebGL()
    {
        string[] scenes = { "Assets/Scenes/SampleScene.unity" }; // 実際のシーンパスに合わせてね
        
        BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions();
        buildPlayerOptions.scenes = scenes;
        buildPlayerOptions.locationPathName = "Build/WebGL";
        buildPlayerOptions.target = BuildTarget.WebGL;
        buildPlayerOptions.options = BuildOptions.None;

        BuildReport report = BuildPipeline.BuildPlayer(buildPlayerOptions);
        var summary = report.summary;

        if (summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            Debug.Log("[Success!] Build succeeded: " + summary.totalSize + " bytes");
        }
        else
        {
            Debug.LogError("[Error!] Build failed with " + summary.totalErrors + " errors.");
            System.Environment.Exit(1); // 失敗時にGitHub Actions側へエラーを伝える
        }
    }
}
