using Tily.Core.Agents;
using Xunit;

namespace Tily.Core.Tests.Agents;

public sealed class ClaudeLaunchCommandTests
{
    private static readonly Guid SessionId = Guid.Parse("3f2c8a51-6d0e-4b7a-9c1f-2e5d7a9b0c14");

    [Fact]
    public void Prepare_WhenDefaultMode_ThenKeepsClaudeSettings()
    {
        var launch = ClaudeLaunchCommand.Prepare(SessionId, "default", null, "powershell");

        Assert.Equal(new ClaudeLaunchModel("3f2c8a51-6d0e-4b7a-9c1f-2e5d7a9b0c14", "claude --session-id 3f2c8a51-6d0e-4b7a-9c1f-2e5d7a9b0c14"), launch);
    }

    [Fact]
    public void Prepare_WhenPlanMode_ThenPassesPermissionMode()
    {
        var command = ClaudeLaunchCommand.Prepare(SessionId, "plan", null, "powershell").Command;

        Assert.Equal("claude --session-id 3f2c8a51-6d0e-4b7a-9c1f-2e5d7a9b0c14 --permission-mode plan", command);
    }

    [Fact]
    public void Prepare_WhenInstallFirstInPowerShell_ThenChainsWithSemicolon()
    {
        var command = ClaudeLaunchCommand.Prepare(SessionId, "acceptEdits", "pnpm install", "powershell").Command;

        Assert.Equal("pnpm install; claude --session-id 3f2c8a51-6d0e-4b7a-9c1f-2e5d7a9b0c14 --permission-mode acceptEdits", command);
    }

    [Fact]
    public void Prepare_WhenInstallFirstInCmd_ThenChainsWithAmpersand()
    {
        var command = ClaudeLaunchCommand.Prepare(SessionId, null, "pnpm install", "cmd").Command;

        Assert.Equal("pnpm install & claude --session-id 3f2c8a51-6d0e-4b7a-9c1f-2e5d7a9b0c14", command);
    }

    [Fact]
    public void Prepare_WhenModeUnknown_ThenFrenchError()
    {
        var error = Assert.Throws<InvalidOperationException>(() => ClaudeLaunchCommand.Prepare(SessionId, "bypassPermissions", null, "powershell"));

        Assert.Equal("Mode de départ inconnu : bypassPermissions.", error.Message);
    }

    [Fact]
    public void Resume_WhenSessionIdValid_ThenResumesIt()
    {
        var command = ClaudeLaunchCommand.Resume("3F2C8A51-6D0E-4B7A-9C1F-2E5D7A9B0C14");

        Assert.Equal("claude --resume 3f2c8a51-6d0e-4b7a-9c1f-2e5d7a9b0c14", command);
    }

    [Fact]
    public void Resume_WhenSessionIdInvalid_ThenFrenchError()
    {
        var error = Assert.Throws<InvalidOperationException>(() => ClaudeLaunchCommand.Resume("x; rm -rf"));

        Assert.Equal("Identifiant de session invalide : x; rm -rf.", error.Message);
    }

    [Fact]
    public void Prepare_WhenNoSessionGiven_ThenEachLaunchGetsItsOwnSession()
    {
        var first = ClaudeLaunchCommand.Prepare("plan", null, "powershell").SessionId;

        var second = ClaudeLaunchCommand.Prepare("plan", null, "powershell").SessionId;

        Assert.NotEqual(first, second);
    }
}
