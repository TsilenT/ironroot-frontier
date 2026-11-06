// Deterministic, synthetic poses only. No ticking, rewards, profile or storage.
export const PRODUCERS = ['barracks','archery','foundry','sanctum','aerie'];
export function createSyntheticScene(Game, mode='roster', phase=.45) {
  const game=new Game({seed:731,ai:false});
  game.state.buildings=[];game.state.units=[];game.state.projectiles=[];game.state.effects=[];
  game.state.gold=[10000,10000];game.state.time=18;game.state.frontline=1600;
  const spawn=(type,side,x,lane,offset=0)=>{
    game._spawn({type,side,x:x-(side?-48:48),y:game.map.lanes[lane],lane,level:1});
    const u=game.state.units.at(-1);u.x=x;u.y=game.map.lanes[lane]+offset;
    u.hp=u.maxHp*(.35+u.id%3*.2);u.cooldown=1;u.attack=0;return u;
  };
  const ui={paused:true,targets:[],protectedTargets:[]};let camera=1600;
  if(mode==='roster') {
    for(const side of [0,1])PRODUCERS.forEach((type,i)=>spawn(type,side,1260+i*170,side?2:0));
  } else if(mode==='dense') {
    for(const side of [0,1])for(let i=0;i<70;i++)spawn(PRODUCERS[i%5],side,1420+(i%10)*38+side*22,Math.floor(i/10)%3,(i%4)*8-12);
    const home=game._place('watchtower',1250,450,0),enemy=game._place('sanctum',1950,450,1);
    ui.targets=[home.id,enemy.id];ui.protectedTargets=[home.id];
    game.state.units[0].x=1250;game.state.units[0].y=470;
    game.state.units[4].x=1250;game.state.units[4].y=470;
    game.state.projectiles=['archer','wizard','siege','gryphon'].map((type,i)=>({type,side:i%2,x:1530+i*45,y:450,sx:1480,sy:450,tx:1780,ty:450,life:1-phase,maxLife:1,sourceAir:i===3,targetAir:false}));
  } else {
    camera=800;
    const home=game._place('watchtower',970,450,0);game._place('barracks',410,450,0);
    ui.targets=[home.id];ui.protectedTargets=[home.id];ui.selected=home.id;ui.build='barracks';
    ui.pointer={x:mode==='occupied'?970:1110,y:450};
    PRODUCERS.forEach((type,i)=>spawn(type,0,700+i*95,1));
  }
  game.state.effects=mode==='dense'?['blast','magic','volley','death','hit','upgrade'].map((type,i)=>({type,x:1535+i*25,y:450+(i%3-1)*18,side:i%2,radius:type==='volley'?150:55,life:1-phase,maxLife:1})):[];
  return {game,ui,camera};
}
