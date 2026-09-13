FROM python:3.11-slim

WORKDIR /app

# GDAL/GEOS needed for shapely + pyproj geodesic calculations used in the
# real district-area computation scripts
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libgeos-dev proj-bin \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Preserve the same ushma/backend + ushma/data relative layout used in
# local dev, since backend/services/*.py resolve paths like
# Path(__file__).resolve().parents[2] / "data" / ... — flattening this
# during the Docker copy would break every real-data path.
COPY backend/ backend/
COPY data/ data/

WORKDIR /app/backend
EXPOSE 5000
ENV PORT=5000
CMD ["python", "app.py"]
