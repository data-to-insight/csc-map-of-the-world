---
title: NVEST Contacts Tool
authors:
- Rob Harrison
status: draft
last_updated: '2025-06-10T08:34:43Z'
tags:
- NVEST
- loader
- validation
tech_stack:
- python
- stlite
- excel
- csv
---


# NVEST Tools(Contacts processing) & Regional Members Overview

In-progress collection of tools towards NVEST related processing.

Tool(s) available via : [NVEST Tools](https://data-to-insight.github.io/nvest/)


## Contacts processing tool

A browser-based process for handling NVEST contacts and events data alongside a (quasi)live regional overview map. 
Uses **stlite** to run Streamlit/pyodide(in stlite) directly in browser and embeds both views via `<iframe>` containers into the html page(s). 
---

## Instructions

### Step1: Pre-processing steps

The master contacts worksheet. will only be up to date if the source data is. Confirm/do the following before running the contacts processing tool.

  1. Download the entire Wix NVEST EOI form submissions. The NVEST contacts, download should be accessed only via [Forms and Submissions](https://manage.wix.com/dashboard/af6cb463-8e72-4034-8f73-3641ad5abc9d/wix-forms-and-payments). Download this data into : 
    - `NVEST/Contacts/NVEST_Contacts_Master_Processing/dddmmmyyy.csv`
  2. If you have any contacts that have been sent seperately(i.e they might not have yet registered via Wix form), they should be added to the list in 
    - `NVEST/Contacts/NVEST_Contacts_Master_Processing/contacts_other_external.csv` 
  3. NVEST event/workshop invitations and attendance data is stored on event sheets within 
    - `NVEST/Contacts/NVEST_Contacts_Master_Processing/Events/event1.csv + event2.csv + event3.csv + .....` 

### Step2: Tool Processing steps

Using [NVEST Contacts Processing Tool](https://data-to-insight.github.io/nvest/)

**There are 4 buttons/actions**
  - Three for uploading the needed source contacts & events data(in this order)

    1. Single file: `NVEST/Contacts/NVEST_Contacts_Master_Processing/<wix_nvest_downloaded_contacts>.csv`

    2. Single file: `NVEST/Contacts/NVEST_Contacts_Master_Processing/contacts_other_external.csv`   

    3. **ALL**/Multiple-files in: `NVEST/Contacts/NVEST_Contacts_Master_Processing/Events/*.csv`

  - One to download the resultant processed contacts data

    - Data downloads as .csv file but MUST be saved/**overwrite** `NVEST/Contacts/NVEST_Contacts_Master_Processing/processed_contacts_refreshed.csv` 

***The processing occurs immeadiately that the 3rd upload source files are added. There is nothing to press or do in order to initiate the actual processing and the download file is available instantly after the above 3 steps are completed.***

### Step3: Update working contacts sheet

Now that the contacts have been processed (i.e. cleaned, de-duped, other data added, steering grp flagged etc) and downloaded into `NVEST\Contacts\4 - contacts_processed\processed_contacts_refreshed.csv`. We are going to refresh the contacts sheet with this data. It's a simple 1 button update. 

  - Open the main Contacts Excel sheet/file on your PC. This is usually located: `NVEST\Contacts\` 
  - From the ribbon, navigate to the 'Data' tab 
  - Click 'Refresh All' from the 'Queries and Connections' block on the ribbon 

  That's it. Whether you notice any changes or not, all the data in the contacts (and events) page(s) is now updated and current. 



---

## Important further information

**NVEST_Contacts_Master.xls**
The master contact sheet itself is NOT where contacts data should be edited/updated. The data sources within `\NVEST\Contacts\NVEST_Contacts_Master_Processing\` are where any changes/edits should be made. The reason is that we refresh all the data within the contacts workbook each time we run this process. So the source data and not the contacts workbook is our single data source for the actual contacts related data. IF wanting to store person/individual specific notes, or additional data against specific records, this can be done using a user defined lookup page in which email address, and those related additional columns/data is stored against them. 

## NVEST Events files

The NVEST events invites/attended are recorded to assist event planning and checking we've correctly contacted all those that have registered their interest. When a new event is planned, the full list of current Contacts emails should be copied from the master contact sheet overview (column `email`), and pasted afresh into into the next free `event1, 2, 3,... file`. **Do not change the file name**, or file type here as it will break the onward data flow. These are csv files so no formatting can be stored in the file. Instead, if desired such formatting can be added in the NVEST_Contacts_Master.xls.... in this file Event1, 2, 3 heading CAN then be changed to reflect the date or another decriptor for each event. To be clear.... col headers can only be modified in the NVEST_Contacts_Master.xls file. 

**Key take-aways for managing events files**

- Events files cant be renamed
- Events files are csv so not for annotating with colour formatting
- Additional columns CAN be added into Events files - but those will NOT come through into the master contacts
- New individual emails can be added to Event file at any point (but those emails/contacts should already exist in Wix OR contacts_other_external.csv)



## Related Tech Notes

### Process Logic

1. **Upload** CSVs:
   - *Wix signups:*  
     `NVEST/Contacts/NVEST_Contacts_Master_Processing/<latest date file>.csv`
   - *Other external contacts:*  
     `NVEST/Contacts/NVEST_Contacts_Master_Processing/contacts_other_external.csv`
   - *NVEST events attendees:*  
     `NVEST/Contacts/NVEST_Contacts_Master_Processing/Events/<upload <ALL> files in this folder>.csv`
2. **Clean + de-duplicate** each:
   - Drop blanks, rename/standardise columns 
   - Parse `submission_date` (empty dates get today())
   - Normalise/lower `email` 
   - Keep latest record by `email` (web sign up record takes priority if duplicates identified)
   - We need to remove dups before merge, as might not have submission date/time on external records - so determining most recent record not possible; so we assume web sign up is more recent as members directed to this input route after having shown interest via another route, e.g. workshop.
   - Ensure column order matches requested output order 
   - Apply basic text normalisation on agreed columns (currently: titlecase on `name`(not yet effective for such as McGregor), `role`, `local_authority`) 
   - Sort on `name` (asc)       
4. **Added fields**:
   - `domain` (captured from email address - as this will be more reliable|consistent than inputted LA name text)  
   - `steering_grp` (default: `"N"`)  
   - `source`: `"Web"` for Wix, `"External"` for others (these labels explain where the contact has originated)

5. **Merge contacts datasets**
   - Bring together Wix contacts, and those coming in from other sources(e.g. via email, or requested)
   - Should a contact be added into the other sources, but later register via the web site the de-dup process will retain the web site registered record
6. **Flag steering group** uses hard-coded email match (repo needs to stay private, as those emails now in code not upload via file)
7. **Preview rows**, & option of timestamped CSV download


---


## Repo structure

- `index.html`:  
  Landing page, currently with: 
  - Left: `upload_tool.html` (iframe)  
  - Right: Embedded Google Map (iframe) 

- `upload_tool.html`:  
  HTML file embedding a stlite-powered Streamlit app

- `assets/`:  
  Img assets (e.g., `images/d2i_logo.png`)
  Styling assets (e.g., `css/styles.css`)

---

## Tech stack

- [Streamlit](https://streamlit.io) for data interface  
- [stlite](https://github.com/whitphx/stlite) to run Streamlit app directly in browser (WebAssembly + Pyodide)  
- [Bootstrap 5](https://getbootstrap.com) for layout  
- [Google My Maps](https://www.google.com/mymaps) for embedded regional visual

---

## Deployment/Development notes

Built to run in **GitHub Pages** and other static hosting providers. Ensure:

- avoid direct browser refresh on subpages (e.g., `/upload_tool.html`) unless served (e.g., via iframe or root-relative path) - i've not added # or 404 handling
- Test : python3 -m http.server 8501

---
