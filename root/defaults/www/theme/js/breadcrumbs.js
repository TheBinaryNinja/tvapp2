/*!
 *
 * This file is part of the nginx-fancyindex-flat-theme, licensed under the GNU
 * General Public License. See the LICENSE file for details.
 *
 * Copyright (C)
 *  2018-2024 Alexander Haase <ahaase@alexhaase.de>
 */
function generateBreadcrumbs(){for(var e,a,n,r=window.location.pathname.replace(/\/$/,"").split("/"),t="",c="",o=0;o<r.length;o++)c+=r[o]+"/",t+=(e=0==o?"Home":decodeURIComponent(r[o]),a=c,'<li class="breadcrumb-item'+((n=o==r.length-1)?' active aria-current="page':"")+'">'+(n?"":'<a href="'+a+'">')+e+(n?"":"</a>"));document.getElementById("breadcrumbs").innerHTML=t}
