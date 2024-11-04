#!/bin/bash

# Max attempt count
ATTEMPTS=10

# Wait time between attempts
WAIT=10

# Submit a job and ensure the RC is 0
JOBID=`zowe jobs submit ds "$1" --rff jobid --rft string`
RC=$?
shift
if [ $RC -gt 0 ]
then
    echo $JOBID 1>&2
    echo "Submit returned a non-zero return code" 1>&2
    exit $RC
fi

# Loop until the job goes to the output queue
until [ $ATTEMPTS -lt 1 ]
do
    STATUS=`zowe jobs view job-status-by-jobid $JOBID --rff status --rft string`
    RC=$?
    if [ $RC -gt 0 ] ; then
        echo $STATUS 1>&2
        echo "The view job status command returned a non-zero rc: $RC" 1>&2
        exit $RC
    fi
    if [ "$STATUS" = "OUTPUT" ] ; then
        break
    else
        ((ATTEMPTS--))
        sleep $WAIT
    fi
done

# Check status
if [ $ATTEMPTS -eq 0 -a "$STATUS" != "OUTPUT" ]; then
    echo "Wait time limit reached" 1>&2
    exit 1
fi

# Purge the jobs
zowe jobs delete old-jobs $@
RC=$?

if [ $RC -gt 0 ]
then
    echo "The delete old-jobs command returned a non-zero rc: $RC" 1>&2
    exit $RC
fi
