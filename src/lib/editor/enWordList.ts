/**
 * 常见英文词表（拼写检查白名单，约 1.5k）。
 * 未命中且像英文词才标红；缩写、代码、URL 由调用方过滤。
 */
const RAW = `
the of and to a in for is on that by this with you it not or be are from at as your
all have new more can was we will home about if page search free but our one other
do no information time they site he up may what which their news out use any there
see only so his when contact here who web also now help get view online first am
been would how were me services some these click its like service than find price
date back top people had list name just over state year day into email two health
world next used go work last most products music buy data make them should address
program products system post her city add policy number such please available
copyright support message after best software then good video well where info rights
public books high school through each links she review years order very job
national design take family based day days even local those using results office
education national car full map reviews program life know games way days
management should login student shopping rate terms quality privacy store water
united hotel real item international center travel comments made report member
details line terms form events air download south case project same pages version
section own found sports house related security both county american photo game
members power while care network down computer systems three total place following
download website education money terms posts companies listing content sports
including partner parts terms problems business services company people general
research university january media including guide board locations white real
protect legal notice window forum until children side art friends images
personal open in top media control location directory term category articles
space sun history community advanced search media news items digital profile
previous main library then card products event forum march calendar
development online help sales search register login login site map privacy
contact about home`;

const EXTRA = `
able about above across act action actually add address admit adult affect after
again against age agency agent ago agree agreement ahead air all allow almost
alone along already also although always American among amount analysis and
animal another answer any anyone anything appear apply approach area argue arm
around arrive art article artist as ask assume at attack attention attorney
audience author authority available avoid away baby back bad bag ball bank bar
base be beat beautiful because become bed before begin behavior behind believe
benefit best better between beyond big bill billion bit black blood blue board
body book born both box boy break bring brother budget build building business
but buy by call camera campaign can cancer candidate capital car card care
career carry case catch cause cell center central century certain certainly
chair challenge chance change character charge check child choice choose church
citizen city civil claim class clear clearly close coach cold collection college
color come commercial common community company compare computer concern
condition conference Congress consider consumer contain continue control cost
could country couple course court cover create crime cultural culture cup
current customer cut dark data daughter day dead deal death debate decade decide
decision deep defense degree Democrat democratic describe design despite
determine develop development die difference different difficult dinner
direction director discover discuss discussion disease do doctor dog door down
draw dream drive drop drug during each early east easy eat economic economy
edge education effect effort eight either election else employee end energy
enjoy enough enter entire environment environmental especially establish even
evening event ever every everybody everyone everything evidence exactly example
executive exist expect experience expert explain eye face fact factor fail fall
family far farm fast father fear federal feel feeling few field fight figure
fill film final finally financial find fine finger finish fire firm first fish
five floor fly focus follow food foot for force foreign forget form former
forward four free friend from front full fund future game garden gas general
generation get girl give glass go goal good government great green ground group
grow growth guess gun guy hair half hand hang happen happy hard have he head
health hear heart heat heavy help her here herself high him himself his history
hit hold home hope hospital hot hotel hour house how however huge human hundred
husband I idea identify if image imagine impact important improve in include
including increase indeed indicate individual industry information inside
instead institution interest interesting international interview into investment
involve issue it item its itself job join just keep key kid kill kind kitchen
know knowledge land language large last late later laugh law lawyer lay lead
leader learn least leave left leg legal less let letter level lie life light
like likely line list listen little live local long look lose loss lot love
low machine magazine main maintain major majority make man manage management
manager many market marriage material matter may maybe me mean measure media
medical meet meeting member memory mention message method middle might military
million mind minute miss mission model modern moment money month more morning
most mother mouth move movement movie Mr Mrs much music must my myself name
nation national natural nature near nearly necessary need network never new
news newspaper next nice night no none nor north not note nothing notice now
n't number occur of off offer office officer official often oh oil ok old on
once one only onto open operation opportunity option or order organization
other others our out outside over own owner page pain painting paper parent
part participant particular particularly partner party pass past patient
pattern pay peace people per perform performance perhaps period person personal
phone physical pick picture piece place plan plant play player PM point police
policy political politics poor popular population position positive possible
power practice prepare present president pressure pretty prevent price private
probably problem process produce product production professional professor
program project property protect prove provide public pull purpose push put
quality question quickly quite race radio raise range rate rather reach read
ready real reality realize really reason receive recent recently recognize
record red reduce reflect region relate relationship religious remain
remember remove report represent Republican require research resource respond
response responsibility rest result return reveal rich right rise risk road
rock role room rule run safe same save say scene school science scientist
score sea season seat second section security see seek seem sell send senior
sense series serious serve service set seven several sex sexual shake share
she shoot short shot should shoulder show side sign significant similar simple
simply since sing single sister sit site situation six size skill skin small
smile so social society soldier some somebody someone something sometimes son
song soon sort sound source south southern space speak special specific speech
spend sport spring staff stage stand standard star start state statement
station stay step still stock stop store story strategy street strong structure
student study stuff style subject success successful such suddenly suffer
suggest summer support sure surface system table take talk task tax teach
teacher team technology television tell ten tend term test than thank that the
their them themselves then theory there these they thing think third this those
though thought thousand threat three through throw thus time to today together
tonight too top total tough toward town trade traditional training travel treat
treatment tree trial trip trouble true truth try turn TV two type under
understand unit until up upon us use usually value various very victim view
violence visit voice vote wait walk wall want war watch water way we weapon
wear week weight well west western what whatever when where whether which while
white who whole whom whose why wide wife will win wind window wish with within
without woman wonder word work worker world worry would write writer wrong yard
yeah year yes yet you young your yourself
`;

function buildSet(): Set<string> {
  const set = new Set<string>();
  for (const chunk of [RAW, EXTRA]) {
    for (const w of chunk.toLowerCase().split(/[^a-z']+/)) {
      if (w.length >= 2) set.add(w);
    }
  }
  return set;
}

export const EN_WORDS = buildSet();
