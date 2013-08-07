<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="ISO-8859-1"%>
<%@ page import="java.util.List" %>
<%@ page import="source.*" %>   
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%
//String URL=request.getParameter("url");
GetFile getfile = new GetFile();
String[] files = getfile.ByFtp("ftp://virbo.org/");


//if(URL.substring(0,4)=="http"){
	//String[] files=getfile.ByUrl(URL);
//}

//String[] files=getfile.ByFtp(URL);
	
  
%>
<html>
<head>
<title>File System</title>
</head>
<body>
<form>
<table border="1">
<%
for(String file:files)
	out.println("<tr><td>"+file+"</td></tr>");
%>
</table>
</form>


</body>
</html>