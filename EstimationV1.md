# Project Estimation - CURRENT
Date: 30/03/2023 

Version: V1 


# Estimation approach
Consider the EZWallet  project in CURRENT version (as received by the teachers), assume that you are going to develop the project INDEPENDENT of the deadlines of the course
# Estimate by size
### 
|             | Estimate                        |             
| ----------- | ------------------------------- |  
| NC =  Estimated number of classes to be developed   |6|             
|  A = Estimated average size per class, in LOC       |100| 
| S = Estimated size of project, in LOC (= NC * A) |600|
| E = Estimated effort, in person hours (here use productivity 10 LOC per person hour)  |60|   
| C = Estimated cost, in euro (here use 1 person hour cost = 30 euro) |1800| 
| Estimated calendar time, in calendar weeks (Assume team of 4 people, 8 hours per day, 5 days per week ) |1| 

# Estimate by product decomposition
### 
|         component name    | Estimated effort (person hours)   |             
| ----------- | ------------------------------- | 
|requirement document    |12|
| GUI prototype |7|
|design document |3|
|code |50|
| unit tests |8|
| api tests |8|
| management documents  |3|



# Estimate by activity decomposition
### 
|         Activity name    | Estimated effort (person hours)   |             
| ----------- | ------------------------------- | 
| GROUP AND PROJECT MANAGEMENT | |
 | Project management plan | 3 |
 | Scheduling | 2 |
 | Risk estimation | 2 |
| REQUIREMENTS PLANNING | |
 | Review existing systems | 3 |
 | Work analysis | 2 |
 | Model process | 1 |
 | Identify user requirements | 5 |
 | Identify performance requirements | 5 |
| DESIGN | |
 | Identify and develop the prototype design | 3 |
 | Developing the GUI prototype | 7 |
| IMPLEMENTATION | |
 | Develop general code | 5 |
 | Developing the models | 4 |
 | Developing the controllers and test code| 40 |
| TESTING | |
 | Api testing | 8 |
 | UI testing | 3 |
 | Testing of NF req | 6 |



###
Insert here Gantt chart with above activities
![Gantt](images/GanttV1.png)

Please note that the Gantt chart is not done based on a group of 4 people working 8 hours a day for 5 days a week.

# Summary

Report here the results of the three estimation approaches. The  estimates may differ. Discuss here the possible reasons for the difference

|             | Estimated effort                        |   Estimated duration |          
| ----------- | ------------------------------- | ---------------|
| estimate by size |60 PH| 7 days|
| estimate by product decomposition |91PH|25 days|   
| estimate by activity decomposition |99PH|28 days|

The reasons why the results given by the three approaches differ from each other could be that the first (by size) uses specific approximations and is only based on the LOC (lines of code) and so it doesn’t include the parts related to PM, requirements, design, and testing.
The difference in the 2 other approaches could be explained by the fact that the one splitting by activities has a higher level of details with respect to the one based on the one splitting based on products.

