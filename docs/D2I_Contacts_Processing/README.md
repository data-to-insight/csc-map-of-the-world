---
title: D2I Contacts Tool
authors:
- Rob Harrison
status: draft
last_updated: '2025-06-10T08:34:43Z'
tags:
- d2i
- loader
- validation
- internal
tech_stack:
- python
- stlite
- excel
- csv
---


# Contacts processing to maintain d2i members

A browser-based process towards enabling and maintaining a clean(er) and reliable members and contact record; reducing|removing our need to use Wix as core contacts management. Uses **stlite** to run Streamlit/pyodide(in stlite) directly in browser and embeds views via `<iframe>` containers into the html page(s). Currently only one tool is defined/requested but this might be extended to include others as needed. 

Tool(s) available via : [Contacts Tool(s)](https://data-to-insight.github.io/d2i-contacts/)


## Problem

Our contacts/members continue to sign up via our web platform Wix, and through the signup process gain access to both the main tools, and if relevant seperate access to such as the Early Help/Apprenticeships groups. Our outgoing contact/updates/newsletters have historically/typically gone out to our entire contacts list, or a (Wix)identifiable group within. However, we increasingly want to reduce both unneccessary/excess/invalid contact with some members and improve individual update quality and relevance of it. Our current data(and Wix limited processing) is proving to be problematic, uncertain and has a bloated time-cost overhead for simple tasks(incl. filtering). 

One solution is to clean the existing data and address the shortfalls within Wix itself. However within this approach is the potential for introducing new problems specifically around tool members access tied to Wix internals incl. contact labelling, and the poor time-efficiency when handling contacts via the Wix interface(e.g. paginated views only) as well as the difficulty around reliably grouping contacts - and access to user defined groupings in exports. Alongside ongoing conversations with Wix to identify and enable work-arounds to improve legacy contacts handling/enrichment/sepertion, we have made a long-term plan to move away from Wix to a clean d2i site build(most likely using Django). As such **this tool supports any interim move to manage contacts outside of Wix, concurrently maintain/refresh members details** (as Wix remains our members' single sign-up entry point).

### Issues summarised

- Searches in Wix limited to complete-email|name only
- Use of custom labelling in Wix is problematic on export/import
- Wix forces a paginated view of members, which as d2i members base expands is increasingly slow to work with 
- New/Legacy labelling within Wix means we now have unreliable single source of truth
- Filtering some specific groups e.g. Members-NVEST only has heavy time-cost overhead, unreliable
- Enriching members data is not easily possible as export/import limits fields
- Data fixes/corrects are record by record 
- Ineffective Wix members overview enables duplicate records
- Newsletter rejections can only be handled 1:1 with manual deletion in Wix (we have PoC scripted versions towards this)
- Re-imports back into Wix problematic, custom field loss

---


## Repo structure

- `index.html`:  
  Landing page, currently with: 
  - Left: `upload_tool.html` (iframe)  

- `upload_tool.html`:  
  HTML file embedding a stlite-powered Streamlit app

- `assets/`:  
  Img assets (e.g., `images/d2i_logo.png`)
  Styling assets (e.g., `css/styles.css`)

---

## Tech stack

- [Streamlit](https://streamlit.io) for data interface  
- [stlite](https://github.com/whitphx/stlite) to run Streamlit app directly in browser (Pyodide)  
- [Bootstrap 5](https://getbootstrap.com) for layout  


## Dev notes & testing

- At the moment py code is embedded into index/upload_tool page, so can't be tested via usual streamlit local running. Instead run:
python -m http.server 8000, or select a different port/py: python3 -m http.server 8501

---

## Deployment/Development notes

Built to run in **GitHub Pages**. 
Note: avoid direct browser refresh on subpages (e.g., `/upload_tool.html`) unless served (e.g., via iframe or root-relative path) - as i've not added # or 404 handling

---
