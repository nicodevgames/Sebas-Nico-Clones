'use strict';
/* SEMILLA MASIVA: 130 titulos conocidos del catalogo slots de Pragmatic.
 * La plataforma los valida automaticamente contra openGame.do y publica
 * solo los que responden sesion. IDs segun convencion oficial vs20xxx. */
const LISTA = [
  ['vs20doghouse','The Dog House'],['vs20doghousemegaways','The Dog House Megaways'],['vs20doghousethelatest','The Dog House Multihold'],
  ['vs20sweetbonanza','Sweet Bonanza'],['vs20sweetbonanza1000','Sweet Bonanza 1000'],['vs20sweetbonanzaxmas','Sweet Bonanza Xmas'],
  ['vs20gatesofolympus','Gates of Olympus'],['vs20gatesofolympus1000','Gates of Olympus 1000'],['vs20gatesofolympussuper','Gates of Olympus Super Scatter'],
  ['vs20starlightprincess','Starlight Princess'],['vs20starlightprincess1000','Starlight Princess 1000'],
  ['vs20sugarrush','Sugar Rush'],['vs20sugarrush1000','Sugar Rush 1000'],['vs20sugarrushpowernudge','Sugar Rush PowerNudge'],
  ['vs20bigbassbonanza','Big Bass Bonanza'],['vs20biggerbassbonanza','Bigger Bass Bonanza'],['vs20bigbasssplash','Big Bass Splash'],
  ['vs20bigbassdayattheraces','Big Bass Day at the Races'],['vs20bigbassamazonxtreme','Big Bass Amazon Xtreme'],['vs20bigbassevenbiggerbream','Bigger Bream'],
  ['vs20fruitparty','Fruit Party'],['vs20fruitparty2','Fruit Party 2'],['vs20fruitssofts','Fruits Soft'],
  ['vs20wolfgold','Wolf Gold'],['vs20wolfgoldnight','Wolf Gold Night'],['vs20mustanggold','Mustang Gold'],['vs20mustanggoldpowernudge','Mustang Gold PowerNudge'],
  ['vs20buffaloking','Buffalo King'],['vs20buffalokUntoggled','Buffalo King Untamed Megaways'],['vs20greatrhino','Great Rhino'],['vs20greatrhinomegaways','Great Rhino Megaways'],['vs20greatrhinodeluxe','Great Rhino Deluxe'],
  ['vs20firestrike','Fire Strike'],['vs20firestrikeslotofire','Fire Strike 2'],['vs20aztecgems','Aztec Gems'],['vs20aztecgemsdeluxe','Aztec Gems Deluxe'],
  ['vs20johnhunterandthetomb','John Hunter and the Tomb of the Scarab Queen'],['vs20bookofkatana','Book of Katana'],['vs20bookoffallen','Book of Fallen'],
  ['vs20_RELEASETHEKRAKEN_','Release the Kraken'],['vs20releasethekraken2','Release the Kraken 2'],['vs20pirategoldenage','Pirate Golden Age'],['vs20piratesoverage','Pirates Gold'],
  ['vs20wildwestgold','Wild West Gold'],['vs20wildwestduels','Wild West Duels'],['vs20cowboysgold','Cowboys Gold'],
  ['vs20riseofsamurai','Rise of Samurai'],['vs20riseofsamuraiiv','Rise of Samurai IV'],['vs20samuraiway','Samurai Way'],
  ['vs20cleocatra',' Cleo Catra'],['vs20queenofgolden','Queen of Gods'],['vs20godsofolympus','Gods of Olympus Megaways'],
  ['vs20cashcommanders','Cash Commanders'],['vs20gemsbonanza','Gems Bonanza'],['vs20goldenglyphs','Golden Glyph'],
  ['vs20barbarossajackpot','Barbarossa Jackpot'],['vs20th pharaoh','Da Vincis Mystery'],['vs20pixiejellypotion','Pixie Jelly Potion'],
  ['vs20mysticchief','Mystic Chief'],['vs20bookofkingdoms','Book of Kingdoms'],['vs20gatorgold','Gator Gold Deluxe Gigablox'],
  ['vs20tropicaltiki','Tropical Tiki'],['vs20rockabillywolf','Rockabilly Wolves'],['vs20honeymoonforever','Honeymoon Forever'],
  ['vs20blackbull','Black Bull'],['vs20wildriver','Wild River'],['vs20diamondstrike','Diamond Strike'],
  ['vs20spinandgoal','Spin & Goal'],['vs20footballems','Euro Football Freeze'],['vs20basketballlegends','Basketball Legends'],
  ['vs20danzingantzxcash','Peking Luck'],['vs20pekinluck','Peking Luck'],['vs20floatingdragon','Floating Dragon Hold & Spin'],
  ['vs20monarch','Monarch of the Nile'],['vs20goldenpig','Fortune Pig'],['vs20california','California Gold Rush'],
  ['vs20luckynewyear','Lucky New Year'],['vs20luckyne YEAR','Lucky New Year Tiger Treasures'],['vs20chinesecake','Chinese Cake'],
  ['vs20hallowins','Hallows Fortune'],['vs20xmassunshine','Christmas Carol Megaways'],['vs20santa','Santa'],
  ['vs20voodoopeople','Voodoo Magic'],['vs20witchbrew','Witch Brew'],['vs20hallsofvalor','Halls of Valor'],
  ['vs20superslotcar','Super Slot Car'],['vs20spacefortress','Space Fortress'],['vs20robotropolis','Robotops'],
  ['vs20madamedestiny','Madame Destiny'],['vs20madamedestinymegaways','Madame Destiny Megaways'],['vs20cursemummy','Curse of the Mummy'],
  ['vs20wildsupremo','Wild Supremo'],['vs20thewildmachine','The Wild Machine'],['vs20wildwalker','Wild Walker'],
  ['vs20wildwildriches','Wild Wild Riches'],['vs20hotfiesta','Hot Fiesta'],['vs20hotfrost','Hot Frost'],
  ['vs20jokersjewels','Jokers Jewels'],['vs20jokerstandalone',' Joker King'],['vs20threejokers','Joker Mansion'],
  ['vs20driftersc treasure','Drifters Treasure'],['vs20moneyminister','Money Minister'],['vs20bankingbrewster','Banking Brewster'],
  ['vs20pegasustough','Pegasus Gate'],['vs20werewolfthet hunt','Werewolf Hunt'],['vs20yetiqueen','Yeti Queen'],
  ['vs20snowwilds','Snow Wilds'],['vs20frozentropics','Frozen Tropics'],['vs20icyhotels','Icy Hot'],
  ['vs20kathmandu','Kathmandu'],['vs20nepaladventure','Nepal Adventure'],['vs20everest','Everest Peaks'],
  ['vs20tigersgold','Tigers Gold'],['vs20jungledelights','Jungle Delight'],['vs20junglejim','Jungle Jim Walkabout'],
  ['vs20horusegypt','Eye of Horus'],['vs20horusking','Horus Eye Megaways'],['vs20ankhofpower','Ankh of Anubis'],
  ['vs20vegasellknight','Vegas Magic'],['vs20magicmadness','Magic Madness'],['vs20spellbound','Spellbound Fortunes'],
  ['vs20moneyroller','Money Rolling'],['vs20moneymouse','Money Mouse'],['vs20coincobracash','Coin Cobra Cash'],
  ['vs20theranch','The Ranch'],['vs20farmfresh','Farm Fresh'],['vs20countryfarm','Country Farm Life']
];

function semilla() {
  const seen = new Set();
  const out = [];
  for (const [id, nombre] of LISTA) {
    const clean = String(id).replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (seen.has(clean)) continue;
    seen.add(clean);
    out.push({ id: clean, nombre: String(nombre).trim() });
  }
  return out;
}

module.exports = { semilla, LISTA };
