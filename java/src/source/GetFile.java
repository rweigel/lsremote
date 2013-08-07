package source;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;

import org.apache.commons.vfs.FileSystemOptions;
import org.apache.commons.vfs.provider.ftp.FtpFileSystemConfigBuilder;
import org.apache.commons.vfs.provider.sftp.SftpFileSystemConfigBuilder;
import org.das2.util.filesystem.FileSystem;
import org.das2.util.filesystem.VFSFileSystem;
import org.das2.util.filesystem.FileSystem.FileSystemOfflineException;

public class GetFile {
	public String[] ByUrl(String url) throws URISyntaxException,FileSystemOfflineException, IOException {
		URI uri = new URI(url);
		FileSystem fs = FileSystem.create(uri);
		String[] list = fs.listDirectory("/");
		return list;
	}

	public String[] ByFtp(String str) throws URISyntaxException,FileSystemOfflineException, IOException {

		FileSystemOptions opts = new FileSystemOptions();
		FtpFileSystemConfigBuilder.getInstance().setUserDirIsRoot(opts, true);
		SftpFileSystemConfigBuilder.getInstance().setUserDirIsRoot(opts, true);
		URI uri = new URI(str);
		FileSystem fs = FileSystem.create(uri);
		String[] list = fs.listDirectory("/");
		return list;

	}

}
