using Windows.Storage.Pickers;
using WinRT.Interop;

namespace Dock.Host.Bridge;

public static class PathPicker
{
    public static async Task<string?> PickAsync(nint windowHandle, bool folder)
    {
        if (folder)
        {
            var folderPicker = new FolderPicker { SuggestedStartLocation = PickerLocationId.ComputerFolder };
            folderPicker.FileTypeFilter.Add("*");
            InitializeWithWindow.Initialize(folderPicker, windowHandle);
            var picked = await folderPicker.PickSingleFolderAsync();
            return picked?.Path;
        }

        var filePicker = new FileOpenPicker { SuggestedStartLocation = PickerLocationId.ComputerFolder };
        filePicker.FileTypeFilter.Add(".exe");
        filePicker.FileTypeFilter.Add(".cmd");
        filePicker.FileTypeFilter.Add(".bat");
        filePicker.FileTypeFilter.Add("*");
        InitializeWithWindow.Initialize(filePicker, windowHandle);
        var file = await filePicker.PickSingleFileAsync();
        return file?.Path;
    }
}
