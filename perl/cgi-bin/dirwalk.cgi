#!/usr/bin/perl

#use strict;
use CGI qw(:standard escapeHTML);
use CGI::Cache;

my $DIRCACHE = "/tmp/cache/";
my $DEBUG    = 0;

#my $CACHEREGEN  = 0;
#my $CACHERESULT = 1;

# Use this for running on command line
my $cgi = new CGI($ENV{'QUERY_STRING'});

# Running from Apache
# my $cgi = new CGI;

$expire = $cgi->param('expire') || "5 seconds";
$purge  = $cgi->param('purge') || 'false';
print "dirwalk.cgi: expire = $expire\n";

########################################################################
my $params = $cgi->Vars;

#if ($params->{'expire'}) {delete $params->{'expire'};}
#if ($cgi->param('debug')) {delete $params->{'debug'};}
#if ($cgi->param('purge')) {delete $params->{'purge'};}

CGI::Cache::set_key( $params );

# Need to put a try catch around this. 
# Will fail if cache does not exist.
eval {                          # try
    CGI::Cache::invalidate_cache_entry() if $purge eq 'true';
    1;
} or do {                       # catch
    print "dirwalk.cgi: purge requested but no cache exists. Continuing.\n"
};


CGI::Cache::setup( { cache_options =>
		     { cache_root => $DIRCACHE,
		       max_size => 20 * 1024 * 1024,
		       default_expires_in => '5 seconds',
		     }
		   } );

print "dirwalk.cgi: Regeneration of cache requested in URI.\n" if $cgi->param('purge') eq 'true';
########################################################################

########################################################################
CGI::Cache::start() or exit;

#print "dirwalk.cgi: Cache entry not found or purge requested.\n";
my $urlin = $ENV{'QUERY_STRING'};
if ($DEBUG) {
    print "dirwalk.cgi: URL input = " . $urlin . "\n";
}

my $nin   = 1;
my @pairs = split(/&/, $urlin);
my %Form  = {};
foreach my $pair (@pairs) {
    (my $name, my $value) = split(/=/, $pair);
    $Form{$name} = $value;
    if ($DEBUG) {
	print "dirwalk.cgi: " . $nin . " " . $name . " = " . $value . "\n";
    }
    $nin = $nin + 1;
}

my $url = $Form{"url"};
$url =~ s/\%([A-Fa-f0-9]{2})/pack('C', hex($1))/seg;
if ($url eq "") {
    $ERROR = 1;
}
my $depth = $Form{"depth"};
if ($depth eq "") {
    $depth = 1;
}
my $ext = $Form{"ext"};
if ($ext eq "") {
    $ext = "";
}

#my $com = "perl dirwalk-remote-lwp-rget --hier --depth $depth --quiet $url";
my $com = "cd ../tmp; perl ../cgi-bin/dirwalk-remote-lwp-rget --hier --depth $depth $url"; 
if ($DEBUG) {
    print "dirwalk.cgi: Calling system with command $com\n";
}
my $result = `cd $DIRTMP; perl ../cgi-bin/dirwalk-remote-lwp-rget --hier --depth $depth $url`; 

my @files = split(/,/,$result);

print header( -TYPE => "text/html; charset=ISO-8859-1" -expires => $expires);

#print $result."\n";
#print "$com\n";
#print "$url\n";

print "[";
foreach (@files) {
    if ($_ =~ m/\.$ext/) {
	$_ =~ s/\R//g;
	print "{\"Name\":\"$_\"},\n";	
    }
}
print "];";

CGI::Cache::stop() or exit;
########################################################################
