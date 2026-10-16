/* Returning cards share their actual owner, without changing parking behavior. */
(function(root){
  'use strict';
  const stack=document.getElementById('miniStack'),rack=document.getElementById('appRack');
  if(!stack||!rack||!root.SpatialTemporaryParking)return;
  const make=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;};
  function metadata(){
    return SpatialTemporaryParking.classify({sessions:tileSessions,workspace:activeWorkspace,column:desktopPages.column(activeWorkspace),
      pages:desktopPages.snapshot(),appState,assignments:displayAssignmentsFor().apps,displayCount:activeDisplayRoster().length});
  }
  function describe(entry){
    const privateOwner=root.SpatialPreviewPrivacy?.hidden(entry.owner),info=appInfo[entry.owner];
    const owner=privateOwner?'another window':info?.label||'another window';
    const location='Desktop '+(entry.page+1)+(activeDisplayRoster().length>1?' · Display '+entry.display:'');
    return {owner,location,art:privateOwner||!info?icon('i-max'):appArt(entry.owner,'app-art-compact'),
      hint:'Returns to '+location+' when '+owner+' is unmaximized.'};
  }
  function arrow(hint){
    const badge=make('span','temporary-park-arrow','↩');badge.title=hint;badge.setAttribute('role','img');badge.setAttribute('aria-label',hint);return badge;
  }
  function decorateCards(){
    const data=metadata(),cards=new Map([...stack.children].filter(card=>card.hasAttribute('data-mini-card')).map(card=>[card.dataset.miniCard,card]));
    const current=desktopPages.current(activeWorkspace),display=localDisplaySlot();
    const groups=[...data.groups].sort((a,b)=>Number(b.page===current)-Number(a.page===current)||Number(b.display===display)-Number(a.display===display)||a.page-b.page||a.display-b.display);
    let grouped=0;
    for(const entry of groups){
      const members=entry.windows.map(id=>cards.get(id)).filter(Boolean);if(!members.length)continue;
      const description=describe(entry),group=make('section','temporary-park-group');
      group.dataset.temporaryParkSession=entry.sessionKey;group.setAttribute('role','group');
      group.setAttribute('aria-label','While '+description.owner+' is maximized · '+description.location);
      const heading=make('header','temporary-park-heading');
      heading.append(make('small','temporary-park-kind','Temporarily parked · '+members.length+' window'+(members.length===1?'':'s')));
      const owner=make('div','temporary-park-owner');
      const artwork=make('span','temporary-park-owner-icon');artwork.innerHTML=description.art;artwork.setAttribute('aria-hidden','true');
      const text=make('div','temporary-park-owner-copy');text.append(make('h3','','While '+description.owner+' is maximized'),make('small','',description.location));
      owner.append(artwork,text);heading.append(owner,make('p','',(members.length===1?'This window returns':'These windows return')+' when you unmaximize '+description.owner+'.'));
      const contents=make('div','temporary-park-cards');group.append(heading,contents);
      for(const card of members){
        card.dataset.temporaryParkOwner=entry.owner;
        card.querySelector('header .mini-actions')?.prepend(arrow(description.hint));
        contents.append(card);cards.delete(card.dataset.miniCard);
      }
      stack.append(group);grouped++;
    }
    const header=stack.parentElement?.querySelector('.section-heading');if(header)header.hidden=grouped>0;
    if(!grouped)return;
    if(cards.size){
      const heading=make('div','temporary-park-ordinary-heading');heading.append(make('h3','','Parked'),make('span','',cards.size+' parked'));stack.append(heading);
      for(const card of cards.values())stack.append(card);
    }
  }
  function decorateRail(){
    const data=metadata();
    for(const button of rack.querySelectorAll('[data-open-app]')){
      const entry=data.byWindow[button.dataset.openApp],badge=button.querySelector('.temporary-park-arrow');
      if(!entry){
        if(!badge)continue;
        badge.remove();button.title=button.dataset.temporaryParkTitle||'';
        button.setAttribute('aria-label',button.dataset.temporaryParkLabel||'');
        delete button.dataset.temporaryParkTitle;delete button.dataset.temporaryParkLabel;
        continue;
      }
      const description=describe(entry);
      if(badge?.title===description.hint)continue;
      if(!badge){button.dataset.temporaryParkTitle=button.title;button.dataset.temporaryParkLabel=button.getAttribute('aria-label')||'';}
      else badge.remove();
      button.append(arrow(description.hint));
      button.title=button.dataset.temporaryParkTitle+' · '+description.hint;
      button.setAttribute('aria-label',button.dataset.temporaryParkLabel+' · '+description.hint);
    }
  }
  const originalMini=renderMiniApps;
  renderMiniApps=function(...args){const result=originalMini(...args);decorateCards();return result;};
  const originalRack=syncRack;
  syncRack=function(...args){const result=originalRack(...args);decorateRail();return result;};
  root.SpatialTemporaryParkingDesktop={describe};
  renderMiniApps();decorateRail();
})(globalThis);
