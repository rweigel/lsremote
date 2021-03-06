#!/usr/bin/perl
use LWP::UserAgent;
use CGI qw(:standard escapeHTML);
use POSIX qw(strftime);
use Date::Calc qw(Add_Delta_Days Delta_Days);


$ua = LWP::UserAgent->new;
$ua->head('<url>');
$cgi = new CGI;

if (!$cgi->param('check')) {
 $check = "false";
} else {
 $check = $cgi->param('check');
}

if (!$cgi->param('start')) {
 $start   = "19980315";
} else {
 $start = $cgi->param('start');
}

if ($cgi->param('template')) {
 $template = $cgi->param('template');
} else {
 $template="";
}

if (!$cgi->param('path')) {
 $path   = "";
} else {
 $path = $cgi->param('path');
}


if (!$cgi->param('return')) {
 if($template ne "" and $path ne "")
 {
  $return="inter"; #Do intersection by default if both paths provided

 } else {
#If no return requested, or only path
  $return   = "";
  if($check eq "true")
  {
   $return="inter";
  }
  if($path ne "")
  {
   $return="diff";
  }
 }
} else {
 $return = $cgi->param('return');
 $check="false";
}

#$script_path = "http://" . $ENV{'SERVER_NAME'} . $ENV{'SCRIPT_NAME'};
$script_path = "http://" . $ENV{'SERVER_NAME'};
#$script_path =~ s/(.*)\/.*.cgi$/$1\//;

print header( -TYPE => "application/javascript; charset=ISO-8859-1");
%exists=();
print $script_path;
if($return ne "")
{
 if($path eq "")
 {
#If path not defined, but a return expected, get it from template
  $template=~/(.*\/)[^\/]*$/;
  $path=$1;
 }
 if($path!~/^.{1,4}\:\/\//)
 {
  $path=$script_path . $path;
 }
 $content=($ua->get($path))->decoded_content or die "Can't access $path";
 @links=();
 @lines=split('\n',$content);
 foreach $line(@lines)
 {
  if($line=~/.*href="([^"]*\.[^"]*)".*/)
  {
   push(@links,$1);
   $exists{$1}=["","",1];
  }
 }
}

$year_o  = substr $start,0,4;
$month_o = substr $start,4,2;
$day_o   = substr $start,6,2;

if ($cgi->param('stop')) {
 $stop    = $cgi->param('stop');
 $year_f  = substr $stop,0,4;
 $month_f = substr $stop,4,2;
 $day_f   = substr $stop,6,2;
} else {
 $year_f  = $year_f;
 $month_f = $month_o;
 $day_f   = $day_o + 1;
}

if($template ne "")
{

 $template=~/([^\%]*\/)([^\/]*\%.*)$/;
$stripped_path=$1;

 $count = 0;
 $Dd = Delta_Days(int($year_o),int($month_o),int($day_o),
   int($year_f),int($month_f),int($day_f));

 while ($Dd >= 0) {
  ($year, $month, $day) = Add_Delta_Days($year_o,$month_o,$day_o,$count);
  $Dd = Delta_Days(int($year),int($month),int($day),
    int($year_f),int($month_f),int($day_f));

  $count = $count + 1;

  $file = strftime($template,0,0,0,
    $day,$month-1,$year-1900,0);

  $file=~/${stripped_path}(.*)$/;
  $file=$1;
  if(exists $exists{$file})
  {
   $exists{$file}=["","",2];
  }
  else
  {
   $exists{$file}=["","",1];
  }
 }
}

@inter=();
@diff=();
foreach $key (keys %exists)
{
 if($exists{$key}[2]==2 or $check eq "true")
 {
  push(@inter,$key);
 }
 else
 {
  push(@diff,$key);
 }
}

#Sort the two
@inter=sort(@inter);
@diff=sort(@diff);

open(FH,"log.txt");

#Print out the results
print "function imagelist(){tmp=[";
if($return=~/inter/)
{
 foreach $file(@inter)
 {

#Return file path to check variables
  $file_full=$stripped_path . $file;
($second, $minute, $hour, $dayOfMonth, $month, $yearOffset, $dayOfWeek, $dayOfYear, $daylightSavings) = localtime();
  $response       = $ua->head($file_full);
($second2, $minute2, $hour2, $dayOfMonth, $month, $yearOffset, $dayOfWeek, $dayOfYear, $daylightSavings) = localtime();
  print FH "$minute:$second to $minute2:$second2 Getting $file with " . $response->is_success . "\n";
  if($response->is_success)
  {
   $content_type   = $response->content_type;
   $content_length = $response->content_length;
   $last_modified  = $response->last_modified;
   $datestamp      = strftime("%Y-%m-%d\",\"%H:%M",
    localtime($last_modified));

   print "[\"$content_length\",\"$datestamp\",\"$file\"],";
  }
 }
}
else
{
 foreach $file(@diff)
 {
  print "[\"\",\"\",\"\",\"$file\"],";
 }
}
close(FH);

print "];return tmp}";
