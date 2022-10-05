FROM python:3.9-slim-buster

ARG HA_DB_URL

WORKDIR /app

ENV TZ='Europe/London'
ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8

RUN apt-get update -y && \
    apt-get install -y \
    cron \
    gettext-base \
    nano

COPY ./tasks /app

# setup cron tasks
RUN touch /var/log/cron.log
RUN chown nobody:nogroup /var/log/cron.log
RUN envsubst < ./crontab.txt > /etc/cron.d/ha_cron
RUN chmod 0644 /etc/cron.d/ha_cron
RUN chown nobody /etc/cron.d/ha_cron
RUN chmod u+s /usr/sbin/cron

ENV PYTHONPATH "${PYTHONPATH}:/app"

RUN pip3 install -r /app/requirements.txt

RUN chmod +x /app/init-tasks.sh

USER nobody

CMD bash /app/init-tasks.sh
