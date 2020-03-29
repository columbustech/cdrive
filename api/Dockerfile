FROM python:3

RUN mkdir /code
WORKDIR /code
COPY requirements.txt /code/
RUN pip install --trusted-host pypi.python.org -r requirements.txt

COPY ./src/ /code/

EXPOSE 8000
CMD python manage.py migrate && gunicorn --bind 0.0.0.0:8000 --workers 3 --timeout 3600 cdrive.wsgi
